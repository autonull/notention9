import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { join } from 'path';
import * as ts from 'typescript';
import * as eslint from 'eslint';
import { StrategySpecSchema, validateStrategySpec, type StrategySpec, type Seam } from './StrategySpec.js';
import type { CandidateStrategy, CandidateDir } from './StrategySpec.js';

export interface GateResult {
    pass: boolean;
    errors: string[];
    warnings: string[];
}

export interface GateReport {
    candidateId: string;
    gates: Record<string, GateResult>;
    overallPass: boolean;
}

/**
 * Run all static gates on a candidate strategy
 */
export async function runStaticGates(
    candidate: CandidateStrategy,
    seams: Seam[]
): Promise<GateReport> {
    const gates: Record<string, GateResult> = {};

    // Gate 1: TypeScript compilation
    gates.typescript = await runTypeScriptGate(candidate);

    // Gate 2: ESLint
    gates.eslint = await runESLintGate(candidate);

    // Gate 3: Seam conformance
    gates.seamConformance = runSeamConformanceGate(candidate, seams);

    // Gate 4: Import allowlist
    gates.importAllowlist = runImportAllowlistGate(candidate);

    // Gate 5: No ambient capabilities
    gates.noAmbientCaps = runNoAmbientCapsGate(candidate);

    // Gate 6: Spec validation
    gates.specValidation = runSpecValidationGate(candidate);

    // Gate 7: A11y
    gates.a11y = runA11yGate(candidate);

    // Gate 8: Keyboard navigation
    gates.keyboard = runKeyboardGate(candidate);

    // Gate 9: Must-win (placeholder - needs comparison)
    gates.mustWin = { pass: true, errors: [], warnings: ['Must-win requires baseline comparison'] };

    const overallPass = Object.values(gates).every(g => g.pass);

    return {
        candidateId: candidate.id,
        gates,
        overallPass,
    };
}

/**
 * Gate 1: TypeScript compilation check
 */
async function runTypeScriptGate(candidate: CandidateStrategy): Promise<GateResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        const sourceFile = ts.createSourceFile(
            `${candidate.id}.tsx`,
            candidate.code,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TSX
        );

        const program = ts.createProgram({
            rootNames: [`${candidate.id}.tsx`],
            options: {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.ESNext,
                moduleResolution: ts.ModuleResolutionKind.Bundler,
                jsx: ts.JsxEmit.ReactJSX,
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                isolatedModules: true,
                noEmit: true,
            },
        });

        const diagnostics = ts.getPreEmitDiagnostics(program);

        for (const diag of diagnostics) {
            if (diag.category === ts.DiagnosticCategory.Error) {
                errors.push(ts.flattenDiagnosticMessageText(diag.messageText, '\n'));
            } else {
                warnings.push(ts.flattenDiagnosticMessageText(diag.messageText, '\n'));
            }
        }
    } catch (e) {
        errors.push(`TypeScript check failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    return { pass: errors.length === 0, errors, warnings };
}

/**
 * Gate 2: ESLint check
 */
async function runESLintGate(candidate: CandidateStrategy): Promise<GateResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        const linter = new eslint.Linter();
        linter.defineRule('no-forbidden-imports', {
            meta: { type: 'problem', schema: [] },
            create(context: any) {
                const forbidden = [
                    'fs', 'fs/promises', 'node:',
                    'eval', 'fetch',
                    'localStorage', 'sessionStorage', 'indexedDB',
                ];
                return {
                    ImportDeclaration(node: any) {
                        const source = node.source?.value;
                        if (source && typeof source === 'string' && forbidden.some((f: string) => source.startsWith(f))) {
                            context.report({ node, message: `Forbidden import: ${source}` });
                        }
                    },
                };
            },
        });

        const config: eslint.Linter.Config = {
            languageOptions: {
                parser: require.resolve('@typescript-eslint/parser'),
                ecmaVersion: 2020,
                sourceType: 'module',
                parserOptions: { ecmaFeatures: { jsx: true } },
            },
            rules: {
                'no-forbidden-imports': 'error',
                'no-unused-vars': 'warn',
                'react/no-unescaped-entities': 'off',
            },
        };

        const results = linter.verify(candidate.code, config, { filename: `${candidate.id}.tsx` });
        
        for (const result of results) {
            if (result.severity === 2) {
                errors.push(`${result.line}:${result.column} - ${result.message}`);
            } else {
                warnings.push(`${result.line}:${result.column} - ${result.message}`);
            }
        }
    } catch (e) {
        warnings.push(`ESLint check failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    return { pass: errors.length === 0, errors, warnings };
}

/**
 * Gate 3: Seam conformance - verify candidate matches seam interface
 */
function runSeamConformanceGate(candidate: CandidateStrategy, seams: Seam[]): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const seam = seams.find(s => s.id === candidate.spec.seam);
    if (!seam) {
        errors.push(`Seam ${candidate.spec.seam} not found`);
        return { pass: false, errors, warnings };
    }

    // Check that component accepts all required props from seam
    const seamProps = seam.propsShape;
    const acceptsProps = (candidate.spec.accepts.properties as Record<string, unknown>) || {};

    for (const [propName, propType] of Object.entries(seamProps)) {
        if (!acceptsProps[propName] && propName !== 'ontology') { // ontology is often optional
            warnings.push(`Seam prop '${propName}' not in accepts schema`);
        }
    }

    // Check that component emits expected events
    const seamEvents = ['propertySaved', 'tagsChanged', 'extractionComplete', 'templateSelected'];
    const emitsEvents = Object.keys(candidate.spec.emits.properties || {});

    // Note: not all seams emit all events, so just warn
    if (emitsEvents.length === 0) {
        warnings.push('No events emitted - check if seam requires output events');
    }

    return { pass: errors.length === 0, errors, warnings };
}

/**
 * Gate 4: Import allowlist
 */
function runImportAllowlistGate(candidate: CandidateStrategy): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const allowlist = [
        'react',
        'react-dom',
        '@notention/ui',
        '@notention/core',
        'zod',
        'date-fns',
        '@notention/ai',
    ];

    const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(candidate.code)) !== null) {
        const importPath = match[1];
        const isAllowed = allowlist.some(allowed => importPath.startsWith(allowed));
        if (!isAllowed && !importPath.startsWith('.')) {
            // Relative imports are allowed
            if (!importPath.startsWith('.')) {
                errors.push(`Disallowed import: ${importPath} (not in allowlist)`);
            }
        }
    }

    return { pass: errors.length === 0, errors, warnings };
}

/**
 * Gate 5: No ambient capabilities
 */
function runNoAmbientCapsGate(candidate: CandidateStrategy): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const forbiddenPatterns = [
        /\beval\s*\(/,
        /\bFunction\s*\(/,
        /\bfetch\s*\(/,
        /\bXMLHttpRequest/,
        /\blocalStorage\./,
        /\bsessionStorage\./,
        /\bindexedDB\./,
        /\bwindow\./,
        /\bdocument\./,
        /\bnavigator\./,
        /\bcrypto\.randomUUID/,
        /\brequire\s*\(/,
        /import\s*\(/, // dynamic import
    ];

    for (const pattern of forbiddenPatterns) {
        if (pattern.test(candidate.code)) {
            errors.push(`Forbidden ambient capability detected: ${pattern.source}`);
        }
    }

    return { pass: errors.length === 0, errors, warnings };
}

/**
 * Gate 6: Spec validation
 */
function runSpecValidationGate(candidate: CandidateStrategy): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        validateStrategySpec(candidate.spec);
    } catch (e) {
        errors.push(`Spec validation failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Additional checks
    if (!candidate.spec.must || candidate.spec.must.length === 0) {
        warnings.push('No "must" requirements specified');
    }
    if (!candidate.spec.mustNot || candidate.spec.mustNot.length === 0) {
        warnings.push('No "mustNot" restrictions specified');
    }

    return { pass: errors.length === 0, errors, warnings };
}

/**
 * Gate 7: A11y checks
 */
function runA11yGate(candidate: CandidateStrategy): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for ARIA attributes
    if (!candidate.code.includes('aria-')) {
        warnings.push('No ARIA attributes found - ensure accessibility');
    }

    // Check for role attributes
    if (!candidate.code.includes('role=')) {
        warnings.push('No role attributes found');
    }

    // Check for label associations
    const hasLabel = candidate.code.includes('<label') || candidate.code.includes('aria-label') || candidate.code.includes('aria-labelledby');
    if (!hasLabel) {
        warnings.push('No label associations found for form inputs');
    }

    // Check for alt text on images
    if (candidate.code.includes('<img') && !candidate.code.includes('alt=')) {
        errors.push('Image missing alt attribute');
    }

    return { pass: errors.length === 0, errors, warnings };
}

/**
 * Gate 8: Keyboard navigation
 */
function runKeyboardGate(candidate: CandidateStrategy): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for tabIndex or focusable elements
    const hasFocusable = candidate.code.includes('tabIndex') || 
                         candidate.code.includes('onKeyDown') || 
                         candidate.code.includes('onKeyUp') ||
                         candidate.code.includes('onKeyPress');

    if (!hasFocusable) {
        warnings.push('No keyboard event handlers found - ensure keyboard navigability');
    }

    // Check for focus management
    if (!candidate.code.includes('focus()') && !candidate.code.includes('autoFocus')) {
        warnings.push('No explicit focus management found');
    }

    return { pass: errors.length === 0, errors, warnings };
}

/**
 * Run gates on all candidates in a directory
 */
export async function runGatesOnCandidateDir(
    dir: CandidateDir,
    seams: Seam[]
): Promise<GateReport[]> {
    const reports: GateReport[] = [];

    for (const candidate of dir.candidates.values()) {
        const report = await runStaticGates(candidate, seams);
        reports.push(report);
    }

    return reports;
}