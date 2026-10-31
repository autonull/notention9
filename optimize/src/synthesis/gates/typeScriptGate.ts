import * as ts from 'typescript';
import type { CandidateStrategy } from '../StrategySpec.js';
import type { GateResult } from '../gates.js';

export async function runTypeScriptGate(candidate: CandidateStrategy): Promise<GateResult> {
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

        const tsconfigPath = 'tsconfig.json';
        let compilerOptions: ts.CompilerOptions = {
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
        };

        try {
            const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
            if (configFile.config && configFile.config.compilerOptions) {
                const parsed = ts.parseJsonConfigFileContent(
                    configFile.config,
                    ts.sys,
                    process.cwd()
                );
                compilerOptions = { ...compilerOptions, ...parsed.options };
            }
        } catch {
            // Use defaults if tsconfig not found
        }

        const host = ts.createCompilerHost(compilerOptions, true);

        const originalGetSourceFile = host.getSourceFile.bind(host);
        host.getSourceFile = (fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void, shouldCreateNewSourceFile?: boolean) => {
            if (fileName === `${candidate.id}.tsx`) {
                return sourceFile;
            }
            return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
        };

        const program = ts.createProgram({
            rootNames: [`${candidate.id}.tsx`],
            options: compilerOptions,
            host,
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