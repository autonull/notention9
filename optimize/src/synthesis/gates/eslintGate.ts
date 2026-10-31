import * as eslint from 'eslint';
import type { CandidateStrategy } from '../StrategySpec.js';
import type { GateResult } from '../gates.js';

export async function runESLintGate(candidate: CandidateStrategy): Promise<GateResult> {
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