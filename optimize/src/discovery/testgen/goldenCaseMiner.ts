import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { globSync } from 'glob';
import { join, dirname } from 'node:path';
import * as ts from 'typescript';

export interface GoldenCase {
    id: string;
    name: string;
    input: string;
    ontology: any[];
    expected: any[];
    forbidden?: any[];
    expectedOutcome: 'suggested' | 'rejected' | 'invalid' | 'applied';
    metadata: {
        source: string;
        runId: string;
        timestamp: string;
        confidence: number;
        extractionMethod: 'deterministic' | 'llm';
    };
}

export interface MiningOptions {
    evidenceDir?: string;
    minConfidence?: number;
    maxCases?: number;
    outputFile?: string;
    includeFailed?: boolean;
}

export class GoldenCaseMiner {
    private evidenceDir: string;

    constructor(evidenceDir: string = '/home/me/notention9/doc/evidence') {
        this.evidenceDir = evidenceDir;
    }

    mine(options: MiningOptions = {}): GoldenCase[] {
        const minConfidence = options.minConfidence ?? 0.8;
        const maxCases = options.maxCases ?? 50;
        const includeFailed = options.includeFailed ?? false;

        const bundles = this.loadBundles();
        const cases: GoldenCase[] = [];

        for (const bundle of bundles) {
            const extractedCases = this.extractCasesFromBundle(bundle, minConfidence, includeFailed);
            cases.push(...extractedCases);
        }

        // Deduplicate by input hash
        const uniqueCases = this.deduplicate(cases);

        // Sort by confidence and recency
        uniqueCases.sort((a, b) => {
            if (a.metadata.confidence !== b.metadata.confidence) {
                return b.metadata.confidence - a.metadata.confidence;
            }
            return new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime();
        });

        const limited = uniqueCases.slice(0, maxCases);

        if (options.outputFile) {
            this.writeCases(limited, options.outputFile);
        }

        return limited;
    }

    private loadBundles(): any[] {
        const bundles: any[] = [];
        const bundleFiles = globSync('**/bundle.json', { cwd: this.evidenceDir, absolute: true });

        for (const file of bundleFiles) {
            try {
                const content = readFileSync(file, 'utf-8');
                const bundle = JSON.parse(content);
                bundles.push(bundle);
            } catch (e) {
                console.warn(`Failed to load bundle ${file}:`, e);
            }
        }

        return bundles;
    }

    private extractCasesFromBundle(bundle: any, minConfidence: number, includeFailed: boolean): GoldenCase[] {
        const cases: GoldenCase[] = [];

        // Extract from prompt traces
        for (const promptTrace of bundle.traces?.prompt || []) {
            if (promptTrace.promptId === 'property-extraction') {
                const input = this.extractInputFromTrace(promptTrace);
                const output = promptTrace.parsed || promptTrace.output;
                const confidence = promptTrace.confidence || 0;

                if (confidence >= minConfidence || includeFailed) {
                    const expected = this.normalizeProperties(output);
                    const expectedOutcome = this.mapOutcome(promptTrace.outcome);

                    cases.push({
                        id: `gc_${bundle.runId}_${promptTrace.promptId}_${Date.now()}`,
                        name: `extraction-${promptTrace.promptId}-${bundle.runId}`,
                        input,
                        ontology: bundle.journey?.seed?.settings?.ontology || [],
                        expected,
                        expectedOutcome,
                        metadata: {
                            source: `evidence:${bundle.runId}`,
                            runId: bundle.runId,
                            timestamp: bundle.env?.timestamp || new Date().toISOString(),
                            confidence,
                            extractionMethod: promptTrace.promptId === 'property-extraction' ? 'deterministic' : 'llm',
                        },
                    });
                }
            }
        }

        return cases;
    }

    private extractInputFromTrace(trace: any): string {
        // Extract the text input from the trace
        if (typeof trace.input === 'string') {
            return trace.input;
        }
        if (trace.input && typeof trace.input === 'object' && 'text' in trace.input) {
            return trace.input.text as string;
        }
        if (trace.context && typeof trace.context === 'object' && 'text' in trace.context) {
            return trace.context.text as string;
        }
        return JSON.stringify(trace.input);
    }

    private normalizeProperties(output: any): any[] {
        if (!output) return [];
        if (Array.isArray(output)) return output;
        if (output.properties && Array.isArray(output.properties)) return output.properties;
        return [];
    }

    private mapOutcome(outcome: string): 'suggested' | 'rejected' | 'invalid' | 'applied' {
        const mapping: Record<string, 'suggested' | 'rejected' | 'invalid' | 'applied'> = {
            'suggested': 'suggested',
            'rejected': 'rejected',
            'invalid': 'invalid',
            'applied': 'applied',
            'refused': 'rejected',
        };
        return mapping[outcome] || 'suggested';
    }

    private deduplicate(cases: GoldenCase[]): GoldenCase[] {
        const seen = new Set<string>();
        const unique: GoldenCase[] = [];

        for (const case_ of cases) {
            const hash = this.hashInput(case_.input);
            if (!seen.has(hash)) {
                seen.add(hash);
                unique.push(case_);
            }
        }

        return unique;
    }

    private hashInput(input: string): string {
        // Simple hash for deduplication
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    private writeCases(cases: GoldenCase[], outputFile: string): void {
        const dir = dirname(outputFile);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        const output = {
            version: 1,
            generatedAt: new Date().toISOString(),
            cases: cases.map(c => ({
                ...c,
                id: c.id,
            })),
        };

        writeFileSync(outputFile, JSON.stringify(output, null, 2));
    }

    // Load existing golden cases
    loadGoldenCases(file: string): GoldenCase[] {
        if (!existsSync(file)) return [];

        try {
            const content = readFileSync(file, 'utf-8');
            const data = JSON.parse(content);
            return data.cases || [];
        } catch {
            return [];
        }
    }

    // Load curated golden cases from the static file
    loadCuratedCases(file: string = 'loop/golden-cases.json'): GoldenCase[] {
        return this.loadGoldenCases(file);
    }

    // Merge mined cases with existing golden cases
    mergeWithExisting(mined: GoldenCase[], existingFile: string): GoldenCase[] {
        const existing = this.loadGoldenCases(existingFile);
        const existingHashes = new Set(existing.map(c => this.hashInput(c.input)));

        const merged = [...existing];
        for (const minedCase of mined) {
            const hash = this.hashInput(minedCase.input);
            if (!existingHashes.has(hash)) {
                merged.push(minedCase);
            }
        }

        return merged;
    }

    // Generate golden cases from a specific journey run
    mineFromRun(runId: string): GoldenCase[] {
        const bundleFile = join(this.evidenceDir, runId, 'bundle.json');
        if (!existsSync(bundleFile)) return [];

        try {
            const content = readFileSync(bundleFile, 'utf-8');
            const bundle = JSON.parse(content);
            return this.extractCasesFromBundle(bundle, 0, true);
        } catch {
            return [];
        }
    }

    // Export cases in the format expected by evaluate.ts
    exportForEvaluation(cases: GoldenCase[], outputFile: string): void {
        const evalCases = cases.map(c => ({
            input: c.input,
            expected: c.expected,
            forbidden: c.forbidden || [],
            expectedOutcome: c.expectedOutcome,
        }));

        const dir = dirname(outputFile);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        writeFileSync(outputFile, JSON.stringify(evalCases, null, 2));
    }

    // Mine golden cases from test files by extracting assertions
    mineFromTests(testDirs: string[] = ['optimize/src/tests', 'core/src/tests', 'ui/src/tests']): GoldenCase[] {
        const cases: GoldenCase[] = [];

        for (const testDir of testDirs) {
            if (!existsSync(testDir)) continue;
            
            const testFiles = globSync('**/*.test.{ts,tsx}', { cwd: testDir, absolute: true });
            
            for (const file of testFiles) {
                const fileCases = this.extractCasesFromTestFile(file);
                cases.push(...fileCases);
            }
        }

        // Deduplicate
        const uniqueCases = this.deduplicate(cases);
        
        // Sort by confidence
        uniqueCases.sort((a, b) => b.metadata.confidence - a.metadata.confidence);
        
        return uniqueCases;
    }

    private extractCasesFromTestFile(filePath: string): GoldenCase[] {
        const cases: GoldenCase[] = [];
        
        try {
            const sourceCode = readFileSync(filePath, 'utf-8');
            const sourceFile = ts.createSourceFile(
                filePath,
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            // Look for test cases with specific patterns
            this.visitNode(sourceFile, (node) => {
                // Look for describe/it blocks with extraction-related names
                if (ts.isCallExpression(node)) {
                    const expr = node.expression;
                    if (ts.isIdentifier(expr) && ['it', 'test'].includes(expr.text)) {
                        const args = node.arguments;
                        if (args.length >= 1 && ts.isStringLiteral(args[0])) {
                            const testName = args[0].text;
                            // Look for extraction-related tests
                            if (this.isExtractionTest(testName)) {
                                // Try to find input/expected in the test body
                                const testBody = args[1];
                                if (testBody && ts.isArrowFunction(testBody)) {
                                    const extracted = this.extractFromTestBody(testBody, testName, filePath);
                                    if (extracted) cases.push(extracted);
                                }
                            }
                        }
                    }
                }
            });
        } catch (e) {
            // Silently skip files that can't be parsed
        }

        return cases;
    }

    private isExtractionTest(testName: string): boolean {
        const keywords = [
            'extract', 'property', 'parse', 'capture', 'note', 
            'template', 'match', 'elicit', 'structure'
        ];
        const lower = testName.toLowerCase();
        return keywords.some(k => lower.includes(k));
    }

    private extractFromTestBody(body: ts.ArrowFunction, testName: string, filePath: string): GoldenCase | null {
        // Try to find string literals that look like input/expected pairs
        const strings: string[] = [];
        
        const visit = (node: ts.Node) => {
            if (ts.isStringLiteral(node) && node.text.length > 10) {
                strings.push(node.text);
            }
            ts.forEachChild(node, visit);
        };
        
        visit(body);
        
        if (strings.length >= 2) {
            // Assume first long string is input, second is expected output
            const input = strings[0];
            const expectedText = strings[1];
            
            // Try to parse expected as properties
            let expected: any[] = [];
            try {
                const parsed = JSON.parse(expectedText);
                if (Array.isArray(parsed)) expected = parsed;
                else if (parsed.properties) expected = parsed.properties;
            } catch {
                // Not JSON, skip
                return null;
            }
            
            return {
                id: `gc_test_${this.hashInput(testName + filePath)}_${Date.now()}`,
                name: `test-${testName.replace(/[^a-z0-9]/gi, '-')}`,
                input,
                ontology: [],
                expected,
                expectedOutcome: 'suggested',
                metadata: {
                    source: `test:${filePath}`,
                    runId: `test-${this.hashInput(filePath)}`,
                    timestamp: new Date().toISOString(),
                    confidence: 0.9, // High confidence from tests
                    extractionMethod: 'deterministic',
                },
            };
        }
        
        return null;
    }

    private visitNode(node: ts.Node, visitor: (node: ts.Node) => void): void {
        visitor(node);
        ts.forEachChild(node, child => this.visitNode(child, visitor));
    }
}

export const goldenCaseMiner = new GoldenCaseMiner();