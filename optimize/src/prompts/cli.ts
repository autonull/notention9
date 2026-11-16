#!/usr/bin/env node
/**
 * Prompt Evaluation CLI — Golden gate for prompt revisions
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { evaluateGoldenSet, type GoldenCase, type Provider, DeterministicProvider, CannedProvider } from './evaluate.js';
import { getAllPrompts, DEFAULT_ONTOLOGY, type Property } from '@notention/core';
import { PROMPT_VARIANTS, renderPrompt } from './variants.js';
import { normalizeProperty, scoreExtraction } from './policy.js';
import type { LabelledCase } from './fewShot.js';
import { WebLLMBridgeProvider, LlamaCppBridgeProvider, closeBridge, closeLlamaCpp } from '../llm/index.js';
import { LlamaCppProvider as NewLlamaCppProvider, type LlamaCppProviderOptions } from './providers/llamaCppProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadGoldenCases(): Promise<GoldenCase[]> {
    const goldenPath = join(__dirname, 'property-extraction.golden.json');
    const content = readFileSync(goldenPath, 'utf-8');
    return JSON.parse(content);
}

async function loadQualityCases(): Promise<GoldenCase[]> {
    const casesDir = join(__dirname, '..', '..', '..', 'data', 'eval', 'cases');
    const manifestPath = join(casesDir, 'manifest.json');
    if (!existsSync(manifestPath)) {
        throw new Error(`Quality cases not found at ${manifestPath}; regenerate the eval corpus first`);
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    return manifest.cases
        .filter((entry: { qualityFamily?: string }) => entry.qualityFamily === 'extraction')
        .map((entry: { id: string; path: string }) => {
            const data = JSON.parse(readFileSync(join(casesDir, entry.path), 'utf-8'));
            return {
                name: entry.id,
                input: data.input,
                expected: data.expected.map(normalizeProperty),
                forbidden: (data.forbidden ?? []).map(normalizeProperty),
                expectedOutcome: data.expectedOutcome ?? 'suggested',
            };
        });
}

/** Labelled quality cases are the few-shot retrieval bank. */
function toFewShotBank(cases: GoldenCase[]): LabelledCase[] {
    return cases.map(testCase => ({
        id: testCase.name,
        input: testCase.input,
        expected: testCase.expected,
    }));
}

class RegistryProvider implements Provider {
    name = 'registry';
    private promptId: string;
    private version?: string;
    private bridgeProvider: WebLLMBridgeProvider;

    constructor(promptId: string, version?: string) {
        this.promptId = promptId;
        this.version = version;
        this.bridgeProvider = new WebLLMBridgeProvider({
            modelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
            headed: process.env.WEBLLM_HEADED === '1',
        });
    }

    async extract(text: string, ontology: any[]): Promise<any[]> {
        return this.bridgeProvider.extract(text, ontology);
    }
}

class LlamaCppProvider implements Provider {
    name = 'llamacpp';
    private bridgeProvider: LlamaCppBridgeProvider;

    constructor(fewShotBank?: readonly LabelledCase[], fewShotCount = 3) {
        this.bridgeProvider = new LlamaCppBridgeProvider({
            modelPath: process.env.LLAMA_MODEL_PATH || '/home/me/notention9/models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf',
            fewShotBank,
            fewShotCount,
        });
    }

    async extract(text: string, ontology: any[]): Promise<any[]> {
        return this.bridgeProvider.extract(text, ontology);
    }
}

function printResults(label: string, results: Awaited<ReturnType<typeof evaluateGoldenSet>>): { passed: number; total: number; errors: string[] } {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const allErrors = results.flatMap(r => r.errors);
    const mean = (pick: (metrics: ReturnType<typeof computeF1>) => number) =>
        total === 0 ? 0 : results.reduce((sum, r) => sum + pick(computeF1(r.expected, r.actual)), 0) / total;
    const f1 = mean(metrics => metrics.f1);
    const precision = mean(metrics => metrics.precision);
    const recall = mean(metrics => metrics.recall);

    console.log(`\n${label}`);
    console.log('='.repeat(label.length));
    console.log(`Passed: ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`Mean F1: ${f1.toFixed(3)} (precision ${precision.toFixed(3)}, recall ${recall.toFixed(3)})`);

    if (allErrors.length > 0) {
        console.log('\nErrors:');
        for (const error of allErrors) {
            console.log(`  ✗ ${error}`);
        }
    }

    const failed = results.filter(result => !result.passed);
    const shown = failed.slice(0, 10);
    for (const result of shown) {
        console.log(`  ✗ ${result.caseName}`);
        console.log(`    Expected: ${JSON.stringify(result.expected)}`);
        console.log(`    Actual:   ${JSON.stringify(result.actual)}`);
    }
    if (failed.length > shown.length) {
        console.log(`  … ${failed.length - shown.length} more failing cases`);
    }
    console.log(`  ✓ ${results.length - failed.length} passed`);

    return { passed, total, errors: allErrors };
}

const program = new Command();

program
    .name('pnpm prompts:eval')
    .description('Notention Prompt Evaluation — Golden gate for prompt revisions')
    .version('1.0.0');

program
    .command('eval')
    .description('Evaluate prompt(s) against golden set')
    .option('-p, --prompt <id@version>', 'Specific prompt to evaluate (default: all registered)')
    .option('--quality', 'Also evaluate against quality cases')
    .option('--quality-limit <n>', 'Evaluate only the first N quality cases (iteration aid)')
    .option('--few-shot <n>', 'Retrieved examples per input (0 disables)', '3')
    .option('--provider <name>', 'Provider to use: deterministic | registry | webllm | llamacpp | llama-cpp-embedded | llama-cpp-server', 'deterministic')
.option('--model-path <path>', 'GGUF model path for embedded llama.cpp')
.option('--server-url <url>', 'OpenAI-compatible server URL for llama.cpp server mode')
.option('--model-name <name>', 'Model name for server mode')
    .action(async (options) => {
        console.log('🔬 Notention Prompt Evaluation');
        console.log('===============================');

        const goldenCases = await loadGoldenCases();
        console.log(`Loaded ${goldenCases.length} golden cases`);

        let qualityCases: GoldenCase[] = [];
        if (options.quality) {
            qualityCases = await loadQualityCases();
            if (options.qualityLimit) {
                qualityCases = qualityCases.slice(0, Number(options.qualityLimit));
            }
            console.log(`Loaded ${qualityCases.length} quality cases`);
        }

        const fewShotBank = qualityCases.length > 0 ? toFewShotBank(qualityCases) : undefined;
        let providers: Provider[] = [];

        const llamaCppOptions: LlamaCppProviderOptions = {
            modelPath: options.modelPath,
            serverUrl: options.serverUrl,
            modelName: options.modelName,
            fewShotBank,
            fewShotCount: Number(options.fewShot ?? 3),
        };

        function createProvider(): Provider {
            switch (options.provider) {
                case 'registry':
                case 'webllm':
                    return new RegistryProvider(options.prompt?.split('@')[0] ?? '', options.prompt?.split('@')[1]);
                case 'llamacpp':
                    return new LlamaCppProvider(fewShotBank, Number(options.fewShot ?? 3));
                case 'llama-cpp-embedded':
                    return new NewLlamaCppProvider({ ...llamaCppOptions, serverUrl: undefined });
                case 'llama-cpp-server':
                    return new NewLlamaCppProvider({ ...llamaCppOptions, modelPath: undefined });
                case 'deterministic':
                default:
                    return new DeterministicProvider();
            }
        }

        if (options.prompt) {
            providers.push(createProvider());
        } else {
            const prompts = getAllPrompts();
            if (prompts.length === 0) {
                console.log('No prompts registered. Using deterministic provider.');
                providers.push(new DeterministicProvider());
            } else {
                for (const prompt of prompts) {
                    if (options.provider === 'registry' || options.provider === 'webllm') {
                        providers.push(new RegistryProvider(prompt.id, prompt.version));
                    } else {
                        providers.push(createProvider());
                    }
                }
            }
        }

        let overallPassed = 0;
        let overallTotal = 0;
        let hasFailures = false;

        for (const provider of providers) {
            // Golden gate runs WITHOUT few-shot (deterministic)
            const goldenProvider = provider instanceof LlamaCppProvider || provider instanceof NewLlamaCppProvider
                ? new NewLlamaCppProvider({ ...llamaCppOptions, fewShotBank: undefined })
                : provider;
            const results = await evaluateGoldenSet(goldenCases, goldenProvider, DEFAULT_ONTOLOGY);
            const summary = printResults(`Golden Set — ${provider.name}`, results);
            overallPassed += summary.passed;
            overallTotal += summary.total;
            if (summary.errors.length > 0) hasFailures = true;

            if (qualityCases.length > 0) {
                const fewShotCount = Number(options.fewShot ?? 3);
                const qualityProvider = fewShotBank && fewShotCount > 0 && (provider instanceof LlamaCppProvider || provider instanceof NewLlamaCppProvider)
                    ? new NewLlamaCppProvider({ ...llamaCppOptions, fewShotBank, fewShotCount })
                    : provider;
                const qResults = await evaluateGoldenSet(qualityCases, qualityProvider, DEFAULT_ONTOLOGY);
                const qSummary = printResults(`Quality Cases — ${provider.name}`, qResults);
                overallPassed += qSummary.passed;
                overallTotal += qSummary.total;
                if (qSummary.errors.length > 0) hasFailures = true;
            }
        }

        console.log('\n' + '='.repeat(40));
        console.log(`Overall: ${overallPassed}/${overallTotal} (${((overallPassed / overallTotal) * 100).toFixed(1)}%)`);

        if (hasFailures) {
            console.log('❌ Evaluation failed — regressions detected');
            await closeBridge();
            await closeLlamaCpp();
            process.exit(1);
        } else {
            console.log('✅ All evaluations passed');
            await closeBridge();
            await closeLlamaCpp();
            process.exit(0);
        }
    });

program
    .command('list')
    .description('List registered prompts')
    .action(() => {
        const prompts = getAllPrompts();
        if (prompts.length === 0) {
            console.log('No prompts registered');
            return;
        }
        console.log('Registered Prompts:');
        console.log('===================');
        for (const prompt of prompts) {
            console.log(`  ${prompt.id}@${prompt.version}`);
            console.log(`    Template: ${prompt.template.slice(0, 80)}...`);
        }
    });

class VariantProvider implements Provider {
    name: string;
    private template: string;

    constructor(name: string, template: string) {
        this.name = name;
        this.template = template;
    }

    async extract(text: string, _ontology: any[]): Promise<any[]> {
        const { alignToOntology } = await import('@notention/core');
        // For ablation without LLM, use deterministic but with prompt context
        // In real usage, this would call the LLM with the rendered prompt
        return alignToOntology(text, DEFAULT_ONTOLOGY);
    }
}

function computeF1(expected: any[], actual: any[]): { precision: number; recall: number; f1: number } {
    const { precision, recall, f1 } = scoreExtraction(expected, actual);
    return { precision, recall, f1 };
}

function computeECE(expected: any[], actual: any[]): number {
    // Expected Calibration Error - simplified for property extraction
    // Bin by confidence, compute |accuracy - confidence| per bin
    const bins = 10;
    let ece = 0;
    let total = 0;

    for (let i = 0; i < bins; i++) {
        const binLow = i / bins;
        const binHigh = (i + 1) / bins;
        let binCount = 0;
        let binCorrect = 0;

        for (const a of actual) {
            const conf = a.confidence ?? 0.5;
            if (conf >= binLow && conf < binHigh) {
                binCount++;
                const match = expected.find(
                    e => e.key === a.key && e.operator === a.operator && e.values.every((v: string) => a.values.includes(v))
                );
                if (match) binCorrect++;
            }
        }

        if (binCount > 0) {
            const accuracy = binCorrect / binCount;
            const confidence = (binLow + binHigh) / 2;
            ece += (binCount / actual.length) * Math.abs(accuracy - confidence);
            total += binCount;
        }
    }

    return total > 0 ? ece : 0;
}

program
    .command('ablation')
    .description('Run E13 prompt ablation study across all variants')
    .option('--quality', 'Evaluate on quality extraction cases (default)', true)
    .option('--repetitions <n>', 'Number of repetitions per case', '3')
    .option('--output <file>', 'Output results JSON file')
    .option('--provider <name>', 'Provider to use: deterministic | llamacpp | llama-cpp-embedded | llama-cpp-server', 'deterministic')
    .option('--model-path <path>', 'GGUF model path for embedded llama.cpp')
    .option('--server-url <url>', 'OpenAI-compatible server URL for llama.cpp server mode')
    .option('--model-name <name>', 'Model name for server mode')
    .action(async (options) => {
        console.log('🧪 Notention Prompt Ablation Study (E13)');
        console.log('==========================================\n');

        const qualityPath = join(__dirname, '..', '..', '..', 'data', 'eval', 'cases', 'manifest.json');
        const content = readFileSync(qualityPath, 'utf-8');
        const manifest = JSON.parse(content);
        
        const extractionCases = manifest.cases.filter((c: any) => c.qualityFamily === 'extraction');
        const qualityCases: any[] = [];
        
        for (const c of extractionCases) {
            const casePath = join(__dirname, '..', '..', '..', 'data', 'eval', 'cases', c.path);
            const caseContent = readFileSync(casePath, 'utf-8');
            const caseData = JSON.parse(caseContent);
            qualityCases.push({
                name: c.id,
                input: caseData.input,
                expected: caseData.expected,
                forbidden: caseData.forbidden ?? [],
                expectedOutcome: caseData.expectedOutcome ?? 'suggested',
            });
        }

        console.log(`Loaded ${qualityCases.length} quality extraction cases`);
        console.log(`Variants to test: ${PROMPT_VARIANTS.length}`);
        console.log(`Repetitions: ${options.repetitions}\n`);

        const allResults: any[] = [];

        for (const variant of PROMPT_VARIANTS) {
            console.log(`\n--- Evaluating ${variant.version} ---`);
            
            let provider: any;
            if (options.provider === 'deterministic') {
                provider = new VariantProvider(variant.version, variant.template);
            } else if (options.provider === 'llamacpp' || options.provider === 'llama-cpp-embedded') {
                const { LlamaCppProvider } = await import('./providers/llamaCppProvider.js');
                provider = new LlamaCppProvider({
                    modelPath: options.modelPath,
                    fewShotBank: [],
                    fewShotCount: 0,
                    systemPrompt: variant.template,
                });
            } else if (options.provider === 'llama-cpp-server') {
                const { LlamaCppProvider } = await import('./providers/llamaCppProvider.js');
                provider = new LlamaCppProvider({
                    serverUrl: options.serverUrl,
                    modelName: options.modelName,
                    fewShotBank: [],
                    fewShotCount: 0,
                    systemPrompt: variant.template,
                });
            } else {
                throw new Error(`Unknown provider: ${options.provider}`);
            }

            const caseResults: any[] = [];

            for (const testCase of qualityCases) {
                const repetitionResults: any[] = [];
                
                for (let rep = 0; rep < parseInt(options.repetitions); rep++) {
                    const actual = await provider.extract(testCase.input, DEFAULT_ONTOLOGY);
                    const f1Metrics = computeF1(testCase.expected, actual);
                    const ece = computeECE(testCase.expected, actual);
                    
                    repetitionResults.push({
                        repetition: rep,
                        actual,
                        f1: f1Metrics.f1,
                        precision: f1Metrics.precision,
                        recall: f1Metrics.recall,
                        ece,
                    });
                }

                // Aggregate across repetitions
                const avgF1 = repetitionResults.reduce((sum, r) => sum + r.f1, 0) / repetitionResults.length;
                const avgPrecision = repetitionResults.reduce((sum, r) => sum + r.precision, 0) / repetitionResults.length;
                const avgRecall = repetitionResults.reduce((sum, r) => sum + r.recall, 0) / repetitionResults.length;
                const avgECE = repetitionResults.reduce((sum, r) => sum + r.ece, 0) / repetitionResults.length;

                caseResults.push({
                    caseName: testCase.name,
                    avgF1,
                    avgPrecision,
                    avgRecall,
                    avgECE,
                    repetitions: repetitionResults,
                });

                console.log(`  ${testCase.name}: F1=${avgF1.toFixed(3)} P=${avgPrecision.toFixed(3)} R=${avgRecall.toFixed(3)} ECE=${avgECE.toFixed(3)}`);
            }

            // Aggregate across cases
            const macroF1 = caseResults.reduce((sum, r) => sum + r.avgF1, 0) / caseResults.length;
            const macroPrecision = caseResults.reduce((sum, r) => sum + r.avgPrecision, 0) / caseResults.length;
            const macroRecall = caseResults.reduce((sum, r) => sum + r.avgRecall, 0) / caseResults.length;
            const macroECE = caseResults.reduce((sum, r) => sum + r.avgECE, 0) / caseResults.length;

            console.log(`  MACRO: F1=${macroF1.toFixed(3)} P=${macroPrecision.toFixed(3)} R=${macroRecall.toFixed(3)} ECE=${macroECE.toFixed(3)}`);

            allResults.push({
                variant: variant.version,
                macroF1,
                macroPrecision,
                macroRecall,
                macroECE,
                caseResults,
            });
        }

        // Summary table
        console.log('\n' + '='.repeat(80));
        console.log('ABLATION SUMMARY (Macro-averaged across quality extraction cases)');
        console.log('='.repeat(80));
        console.log('Variant                          | F1      | Prec    | Rec     | ECE    ');
        console.log('-'.repeat(80));
        
        const sorted = [...allResults].sort((a, b) => b.macroF1 - a.macroF1);
        for (const r of sorted) {
            const marker = r.variant === sorted[0].variant ? ' ← BEST' : '';
            console.log(`${r.variant.padEnd(32)} | ${r.macroF1.toFixed(3)} | ${r.macroPrecision.toFixed(3)} | ${r.macroRecall.toFixed(3)} | ${r.macroECE.toFixed(3)}${marker}`);
        }

        console.log('\n' + '='.repeat(80));
        console.log(`Winner: ${sorted[0].variant} (F1=${sorted[0].macroF1.toFixed(3)})`);

        if (options.output) {
            const output = {
                timestamp: new Date().toISOString(),
                qualityCases: qualityCases.length,
                repetitions: parseInt(options.repetitions),
                results: allResults,
                winner: sorted[0].variant,
            };
            const { writeFileSync } = await import('node:fs');
            writeFileSync(options.output, JSON.stringify(output, null, 2));
            console.log(`\nResults written to ${options.output}`);
        }

        // McNemar test placeholder - would compare winner vs baseline per-case
        console.log('\nNote: McNemar test vs baseline requires binary pass/fail per case.');
        console.log('Run with --quality and an LLM provider for statistical significance testing.');
        await closeBridge();
        await closeLlamaCpp();
    });

// ============================================================================
// COMPARE: 1-step vs 2-step pipeline
// ============================================================================

import { comparePipelines } from './twoStepPipeline.js';

program
    .command('compare')
    .description('Compare 1-step vs 2-step extraction pipelines')
    .option('-m, --model <path>', 'Model path (default: Qwen 3.5 0.8B)')
    .option('--limit <n>', 'Number of quality cases to test', '20')
    .option('--few-shot <n>', 'Retrieved examples per input (0 disables)', '3')
    .option('--output <file>', 'Output results JSON file')
    .action(async (options) => {
        console.log('⚖️  Pipeline Comparison: 1-step vs 2-step');
        console.log('============================================\n');

        const modelPath = options.model || process.env.LLAMA_MODEL_PATH || '/home/me/notention9/models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf';
        console.log(`Model: ${modelPath}`);

        const qualityPath = join(__dirname, '..', '..', '..', 'data', 'eval', 'cases', 'manifest.json');
        const content = readFileSync(qualityPath, 'utf-8');
        const manifest = JSON.parse(content);
        
        const extractionCases = manifest.cases.filter((c: any) => c.qualityFamily === 'extraction');
        const limit = parseInt(options.limit);
        const cases = extractionCases.slice(0, limit);

        // Build few-shot bank from all quality cases (not just the test subset)
        const allQualityCases = extractionCases.map((c: any) => {
            const casePath = join(__dirname, '..', '..', '..', 'data', 'eval', 'cases', c.path);
            const caseData = JSON.parse(readFileSync(casePath, 'utf-8'));
            return { id: c.id, input: caseData.input, expected: caseData.expected };
        });

        const inputs: string[] = [];
        const expectedList: Property[][] = [];

        for (const c of cases) {
            const casePath = join(__dirname, '..', '..', '..', 'data', 'eval', 'cases', c.path);
            const caseContent = readFileSync(casePath, 'utf-8');
            const caseData = JSON.parse(caseContent);
            inputs.push(caseData.input);
            expectedList.push(caseData.expected);
        }

        const fewShotCount = parseInt(options.fewShot);
        console.log(`Testing ${inputs.length} cases with ${fewShotCount}-shot...\n`);

        const results = await comparePipelines(inputs, expectedList, modelPath, allQualityCases, fewShotCount);

        // Summary
        let oneStepWins = 0;
        let twoStepWins = 0;
        let ties = 0;
        let oneStepTotalF1 = 0;
        let twoStepTotalF1 = 0;

        console.log('Results:');
        console.log('-'.repeat(100));
        console.log('Case                           | 1-step F1 | 2-step F1 | Router Domain    | Winner');
        console.log('-'.repeat(100));

        for (const r of results) {
            const winner = r.oneStepF1 > r.twoStepF1 ? '1-step' : r.twoStepF1 > r.oneStepF1 ? '2-step' : 'tie';
            if (winner === '1-step') oneStepWins++;
            else if (winner === '2-step') twoStepWins++;
            else ties++;

            oneStepTotalF1 += r.oneStepF1;
            twoStepTotalF1 += r.twoStepF1;

            const caseName = r.input.slice(0, 30).padEnd(30);
            console.log(`${caseName} | ${r.oneStepF1.toFixed(3)}      | ${r.twoStepF1.toFixed(3)}      | ${r.twoStep.router.domain.padEnd(16)} | ${winner}`);
        }

        console.log('-'.repeat(100));
        console.log(`1-step avg F1: ${(oneStepTotalF1 / results.length).toFixed(3)} (wins: ${oneStepWins})`);
        console.log(`2-step avg F1: ${(twoStepTotalF1 / results.length).toFixed(3)} (wins: ${twoStepWins})`);
        console.log(`Ties: ${ties}`);

        if (options.output) {
            const { writeFileSync } = await import('node:fs');
            writeFileSync(options.output, JSON.stringify({
                timestamp: new Date().toISOString(),
                model: modelPath,
                cases: results.length,
                oneStepAvgF1: oneStepTotalF1 / results.length,
                twoStepAvgF1: twoStepTotalF1 / results.length,
                oneStepWins,
                twoStepWins,
                ties,
                details: results,
            }, null, 2));
            console.log(`\nResults written to ${options.output}`);
        }

        await closeBridge();
        await closeLlamaCpp();
    });

// ============================================================================
// MATRIX: Model matrix evaluation across multiple models
// ============================================================================

interface ModelMatrixResult {
    modelPath: string;
    modelName: string;
    goldenPassed: number;
    goldenTotal: number;
    qualityPassed: number;
    qualityTotal: number;
    qualityMeanF1: number;
    qualityMeanPrecision: number;
    qualityMeanRecall: number;
    timestamp: string;
}

async function loadAllQualityCasesForFewShot(): Promise<LabelledCase[]> {
    const casesDir = join(__dirname, '..', '..', '..', 'data', 'eval', 'cases');
    const manifestPath = join(casesDir, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    const extractionCases = manifest.cases.filter((c: any) => c.qualityFamily === 'extraction');
    return extractionCases.map((c: any) => {
        const casePath = join(casesDir, c.path);
        const caseData = JSON.parse(readFileSync(casePath, 'utf-8'));
        return { id: c.id, input: caseData.input, expected: caseData.expected };
    });
}

async function runModelEvaluation(
    modelPath: string,
    modelName: string,
    goldenCases: GoldenCase[],
    qualityCases: GoldenCase[],
    fewShotBank: LabelledCase[],
    fewShotCount: number
): Promise<ModelMatrixResult> {
    const { LlamaCppProvider } = await import('./providers/llamaCppProvider.js');
    const { closeLlamaCpp } = await import('../llm/index.js');

    const provider = new LlamaCppProvider({
        modelPath,
        fewShotBank,
        fewShotCount,
    });

    // Golden gate
    const goldenResults = await evaluateGoldenSet(goldenCases, provider, DEFAULT_ONTOLOGY);
    const goldenPassed = goldenResults.filter(r => r.passed).length;
    const goldenTotal = goldenResults.length;

    // Quality extraction
    let qualityPassed = 0;
    let totalF1 = 0;
    let totalPrecision = 0;
    let totalRecall = 0;

    for (const testCase of qualityCases) {
        const actual = await provider.extract(testCase.input, DEFAULT_ONTOLOGY);
        const score = scoreExtraction(testCase.expected, actual);

        const casePassed = score.missing.length === 0 && score.extra.length === 0;
        if (casePassed) qualityPassed++;

        totalF1 += score.f1;
        totalPrecision += score.precision;
        totalRecall += score.recall;
    }

    await closeLlamaCpp();

    return {
        modelPath,
        modelName,
        goldenPassed,
        goldenTotal,
        qualityPassed,
        qualityTotal: qualityCases.length,
        qualityMeanF1: totalF1 / qualityCases.length,
        qualityMeanPrecision: totalPrecision / qualityCases.length,
        qualityMeanRecall: totalRecall / qualityCases.length,
        timestamp: new Date().toISOString(),
    };
}

program
    .command('matrix')
    .description('Run model matrix evaluation across multiple GGUF models')
    .option('--models <paths>', 'Comma-separated model paths (default: 0.8B,2B,4B in models dir)')
    .option('--quality-limit <n>', 'Evaluate only the first N quality cases', '60')
    .option('--few-shot <n>', 'Retrieved examples per input (0 disables)', '3')
    .option('--output <file>', 'Output results JSON file')
    .action(async (options) => {
        console.log('📊 Notention Model Matrix Evaluation');
        console.log('=====================================\n');

        const goldenCases = await loadGoldenCases();
        console.log(`Loaded ${goldenCases.length} golden cases`);

        let qualityCases = await loadQualityCases();
        if (options.qualityLimit) {
            qualityCases = qualityCases.slice(0, Number(options.qualityLimit));
        }
        console.log(`Loaded ${qualityCases.length} quality cases (test subset)`);

        // Load full quality corpus for few-shot retrieval (matches eval command behavior)
        const fewShotBank = await loadAllQualityCasesForFewShot();
        console.log(`Loaded ${fewShotBank.length} cases for few-shot retrieval`);

        const fewShotCount = Number(options.fewShot ?? 3);

        // Default models to test
        const defaultModels = [
            { name: 'Qwen 3.5 0.8B', path: '/home/me/notention9/models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf' },
            { name: 'Qwen 3.5 2B', path: '/home/me/notention9/models/Qwen_Qwen3.5-2B-Q4_K_M.gguf' },
            { name: 'Qwen 3.5 4B', path: '/home/me/notention9/models/Qwen_Qwen3.5-4B-Q4_K_M.gguf' },
        ];

        let modelsToTest = defaultModels;
        if (options.models) {
            modelsToTest = options.models.split(',').map((p: string) => {
                const trimmed = p.trim();
                const name = trimmed.split('/').pop()?.replace('.gguf', '') ?? trimmed;
                return { name, path: trimmed };
            });
        }

        // Filter to existing models
        const { existsSync } = await import('node:fs');
        modelsToTest = modelsToTest.filter(m => existsSync(m.path));
        
        if (modelsToTest.length === 0) {
            console.error('No valid models found to test');
            process.exit(1);
        }

        console.log(`\nTesting ${modelsToTest.length} model(s):`);
        for (const m of modelsToTest) {
            console.log(`  - ${m.name}: ${m.path}`);
        }
        console.log('');

        const results: ModelMatrixResult[] = [];

        for (const model of modelsToTest) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Evaluating: ${model.name}`);
            console.log('='.repeat(60));

            try {
                const result = await runModelEvaluation(
                    model.path,
                    model.name,
                    goldenCases,
                    qualityCases,
                    fewShotBank,
                    fewShotCount
                );
                results.push(result);

                console.log(`\nGolden Gate: ${result.goldenPassed}/${result.goldenTotal} (${((result.goldenPassed / result.goldenTotal) * 100).toFixed(1)}%)`);
                console.log(`Quality Extraction: ${result.qualityPassed}/${result.qualityTotal} (${((result.qualityPassed / result.qualityTotal) * 100).toFixed(1)}%)`);
                console.log(`Mean F1: ${result.qualityMeanF1.toFixed(3)} (P: ${result.qualityMeanPrecision.toFixed(3)}, R: ${result.qualityMeanRecall.toFixed(3)})`);
            } catch (error) {
                console.error(`Failed to evaluate ${model.name}:`, error);
                results.push({
                    modelPath: model.path,
                    modelName: model.name,
                    goldenPassed: 0,
                    goldenTotal: goldenCases.length,
                    qualityPassed: 0,
                    qualityTotal: qualityCases.length,
                    qualityMeanF1: 0,
                    qualityMeanPrecision: 0,
                    qualityMeanRecall: 0,
                    timestamp: new Date().toISOString(),
                });
            }
        }

        // Summary table
        console.log('\n' + '='.repeat(100));
        console.log('MODEL MATRIX SUMMARY');
        console.log('='.repeat(100));
        console.log('Model                    | Golden Pass | Quality Pass | Mean F1 | Mean Prec | Mean Rec');
        console.log('-'.repeat(100));

        const sorted = [...results].sort((a, b) => b.qualityMeanF1 - a.qualityMeanF1);
        for (const r of sorted) {
            const marker = r === sorted[0] ? ' ← BEST' : '';
            console.log(`${r.modelName.padEnd(24)} | ${String(r.goldenPassed).padStart(5)}/${r.goldenTotal} | ${String(r.qualityPassed).padStart(6)}/${r.qualityTotal} | ${r.qualityMeanF1.toFixed(3)}   | ${r.qualityMeanPrecision.toFixed(3)}    | ${r.qualityMeanRecall.toFixed(3)}${marker}`);
        }

        console.log('-'.repeat(100));

        if (options.output) {
            const { writeFileSync } = await import('node:fs');
            const output = {
                timestamp: new Date().toISOString(),
                goldenCases: goldenCases.length,
                qualityCases: qualityCases.length,
                fewShotCount,
                results: sorted,
                winner: sorted[0]?.modelName ?? 'none',
            };
            writeFileSync(options.output, JSON.stringify(output, null, 2));
            console.log(`\nResults written to ${options.output}`);
        }

        await closeBridge();
        await closeLlamaCpp();
    });

program.parse();