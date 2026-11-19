/**
 * Local Evaluation Harness — Offline golden + quality + match with caching
 * Force multiplier for W1 quality iteration: caches per-case results so 4B runs stay < 5 min.
 */

import { Command } from '../Command.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { MatchEngine } from '@notention/core/matching';
import { ExtractionPipeline, createNote, type Note, type Property, type OntologyNode } from '@notention/core';
import { getOntology, collectOntologyKeysInTree } from '@notention/core/ontology';
import { QUALITY_CASE_NOTES } from '@notention/core/fixtures';
import { evaluateExtraction, evaluateMatch } from '@notention/core/eval/verdict';
import { readManifest, type QualityCase, type ExtractionExpectation, type MatchExpectation } from '@notention/core/eval/caseManifest';
import { evaluateGoldenSet, type GoldenCase, type Provider, DeterministicProvider, type EvaluationResult } from '../../prompts/evaluate.js';
import { LlamaCppProvider as NewLlamaCppProvider, type LlamaCppProviderOptions } from '../../prompts/providers/llamaCppProvider.js';
import { normalizeProperty, scoreExtraction } from '../../prompts/policy.js';
import type { LabelledCase } from '../../prompts/fewShot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CacheEntry {
    caseId: string;
    providerHash: string;
    result: any;
    timestamp: string;
}

interface EvalLocalResult {
    timestamp: string;
    golden: {
        total: number;
        passed: number;
        meanF1: number;
        caseResults: any[];
    };
    quality: {
        extraction: {
            total: number;
            passed: number;
            avgPrecision: number;
            avgRecall: number;
            avgF1: number;
            caseResults: any[];
        };
        match: {
            total: number;
            passed: number;
            avgPrecision: number;
            avgRecall: number;
            avgF1: number;
            caseResults: any[];
        };
    };
    cacheHits: number;
    cacheMisses: number;
}

const DEFAULT_PASS_THRESHOLD = 0.75;
const CACHE_DIR = join('data', 'eval', 'cache');

async function getProjectRoot(): Promise<string> {
    let root = process.cwd();
    while (root !== '/') {
        if (existsSync(join(root, 'pnpm-workspace.yaml'))) {
            return root;
        }
        root = join(root, '..');
    }
    return process.cwd();
}

function getProviderHash(options: LlamaCppProviderOptions): string {
    const keyParts = [
        options.modelPath || 'default',
        options.contextSize?.toString() || '2048',
        options.gpuLayers?.toString() || 'max',
        options.temperature?.toString() || '0',
        options.fewShotCount?.toString() || '3',
    ];
    return keyParts.join('|');
}

async function loadCache(cacheDir: string, providerHash: string): Promise<Map<string, CacheEntry>> {
    const cachePath = join(cacheDir, `${providerHash}.json`);
    if (!existsSync(cachePath)) return new Map();
    try {
        const content = await readFile(cachePath, 'utf-8');
        const entries = JSON.parse(content) as Array<{key: string; value: CacheEntry}>;
        const map = new Map<string, CacheEntry>();
        for (const entry of entries) {
            map.set(entry.key, entry.value);
        }
        return map;
    } catch {
        return new Map();
    }
}

async function saveCache(cacheDir: string, providerHash: string, cache: Map<string, CacheEntry>): Promise<void> {
    await mkdir(cacheDir, { recursive: true });
    const cachePath = join(cacheDir, `${providerHash}.json`);
    const entries = Array.from(cache.entries()).map(([key, value]) => ({key, value}));
    await writeFile(cachePath, JSON.stringify(entries, null, 2));
}

async function loadGoldenCases(): Promise<GoldenCase[]> {
    const goldenPath = join(__dirname, '..', '..', 'prompts', 'property-extraction.golden.json');
    const content = readFileSync(goldenPath, 'utf-8');
    return JSON.parse(content);
}

function toFewShotBank(cases: GoldenCase[]): LabelledCase[] {
    return cases.map(testCase => ({
        id: testCase.name,
        input: testCase.input,
        expected: testCase.expected,
    }));
}

function getOntologyArray(): OntologyNode[] {
    return Array.from(getOntology().nodes.values());
}

export class EvalLocalCommand extends Command {
    readonly name = 'eval:local';
    readonly description = 'Run offline golden + quality + match evaluation with per-case caching; prints one summary table';
    readonly options = [
        { name: 'provider', type: 'string' as const, short: 'p', description: 'Provider: deterministic | llama-cpp-embedded | llama-cpp-server (default: deterministic)' },
        { name: 'model-path', type: 'string' as const, description: 'GGUF model path for embedded llama.cpp' },
        { name: 'server-url', type: 'string' as const, description: 'OpenAI-compatible server URL for llama.cpp server mode' },
        { name: 'model-name', type: 'string' as const, description: 'Model name for server mode' },
        { name: 'context-size', type: 'number' as const, description: 'Context window size (n_ctx) for embedded llama.cpp', default: '2048' },
        { name: 'gpu-layers', type: 'string' as const, description: 'GPU layers to offload (number, "max", or "auto")', default: 'max' },
        { name: 'dispose-between-cases', type: 'boolean' as const, description: 'Dispose model between extractions to free VRAM' },
        { name: 'few-shot', type: 'number' as const, description: 'Few-shot examples per input (0 disables)', default: '3' },
        { name: 'quality-limit', type: 'number' as const, description: 'Limit quality cases for fast iteration' },
        { name: 'golden-only', type: 'boolean' as const, description: 'Run only golden gate (skip quality)' },
        { name: 'quality-only', type: 'boolean' as const, description: 'Run only quality (skip golden)' },
        { name: 'output', type: 'string' as const, short: 'o', description: 'Output directory (default: data/eval/local)' },
        { name: 'json', type: 'boolean' as const, description: 'Output JSON to stdout' },
        { name: 'pass-threshold', type: 'number' as const, description: `Pass threshold for mean F1 (default: ${DEFAULT_PASS_THRESHOLD})` },
        { name: 'no-cache', type: 'boolean' as const, description: 'Disable caching' },
        { name: 'clear-cache', type: 'boolean' as const, description: 'Clear cache before run' },
    ];

    async execute(args: {
        provider?: string;
        modelPath?: string;
        serverUrl?: string;
        modelName?: string;
        contextSize?: number;
        gpuLayers?: string;
        disposeBetweenCases?: boolean;
        fewShot?: number;
        qualityLimit?: number;
        goldenOnly?: boolean;
        qualityOnly?: boolean;
        output?: string;
        json?: boolean;
        passThreshold?: number;
        noCache?: boolean;
        clearCache?: boolean;
        positionals: string[];
    }): Promise<number> {
        try {
            const providerName = args.provider ?? 'deterministic';
            const passThreshold = args.passThreshold ?? DEFAULT_PASS_THRESHOLD;
            const outputDir = args.output ?? join(process.cwd(), 'data', 'eval', 'local');
            const fewShotCount = args.fewShot ?? 3;
            const useCache = !args.noCache;

            const providerOptions: LlamaCppProviderOptions = {
                modelPath: args.modelPath,
                serverUrl: args.serverUrl,
                modelName: args.modelName,
                contextSize: args.contextSize ?? 2048,
                gpuLayers: args.gpuLayers === 'auto' || args.gpuLayers === 'max' ? args.gpuLayers : Number(args.gpuLayers ?? 'max'),
                temperature: 0,
                fewShotCount,
                disposeBetweenCases: args.disposeBetweenCases,
            };
            const providerHash = getProviderHash(providerOptions);
            const projectRoot = await getProjectRoot();
            const cacheDir = join(projectRoot, CACHE_DIR);

            let cache = new Map<string, CacheEntry>();
            let cacheHits = 0;
            let cacheMisses = 0;

            if (useCache) {
                if (args.clearCache) {
                    this.printInfo('Clearing evaluation cache...');
                } else {
                    cache = await loadCache(cacheDir, providerHash);
                    this.printInfo(`Loaded cache: ${cache.size} entries`);
                }
            }

            const timestamp = new Date().toISOString();

            // --- Golden Gate ---
            let goldenResult: EvalLocalResult['golden'] = { total: 0, passed: 0, meanF1: 0, caseResults: [] };

            if (!args.qualityOnly) {
                this.printInfo('📋 Running golden gate evaluation...');
                const goldenCases = await loadGoldenCases();
                this.printInfo(`Loaded ${goldenCases.length} golden cases`);

                const provider = this.createProvider(providerName, providerOptions, undefined);
                const goldenProvider = provider instanceof NewLlamaCppProvider
                    ? new NewLlamaCppProvider({ ...providerOptions, fewShotBank: undefined })
                    : provider;

                const results = await evaluateGoldenSet(goldenCases, goldenProvider, getOntologyArray());

                let passed = 0;
                const caseResults = [];
                for (const result of results) {
                    const f1 = scoreExtraction(result.expected, result.actual).f1;
                    if (result.passed) passed++;
                    caseResults.push({
                        caseId: result.caseName,
                        expected: result.expected,
                        actual: result.actual,
                        f1,
                        passed: result.passed,
                        errors: result.errors,
                    });
                }

                const meanF1 = results.length > 0
                    ? results.reduce((sum, r) => sum + scoreExtraction(r.expected, r.actual).f1, 0) / results.length
                    : 0;

                goldenResult = { total: results.length, passed, meanF1, caseResults };
                this.printInfo(`Golden: ${passed}/${results.length} passed, mean F1: ${meanF1.toFixed(3)}`);
            }

            // --- Quality Evaluation ---
            let qualityExtractionResult: EvalLocalResult['quality']['extraction'] = { total: 0, passed: 0, avgPrecision: 0, avgRecall: 0, avgF1: 0, caseResults: [] };
            let qualityMatchResult: EvalLocalResult['quality']['match'] = { total: 0, passed: 0, avgPrecision: 0, avgRecall: 0, avgF1: 0, caseResults: [] };

            if (!args.goldenOnly) {
                this.printInfo('🔬 Running quality evaluation...');
                const manifest = readManifest();
                const extractionCases = manifest.cases.filter((c: any) => c.qualityFamily === 'extraction');
                const matchCases = manifest.cases.filter((c: any) => c.qualityFamily === 'match');

                if (args.qualityLimit) {
                    this.printInfo(`Limiting to first ${args.qualityLimit} cases per family`);
                }

                const extractionLimit = args.qualityLimit ?? extractionCases.length;
                const matchLimit = args.qualityLimit ?? matchCases.length;

                // --- Extraction Quality ---
                const extractionEngine = this.createExtractionEngine(providerName, providerOptions);
                const extractionCasesToRun = extractionCases.slice(0, extractionLimit);
                const extractionResults = [];

                this.printInfo(`Running ${extractionCasesToRun.length} extraction quality cases...`);

                for (const caseRef of extractionCasesToRun) {
                    const casePath = join(projectRoot, 'data', 'eval', 'cases', caseRef.path);
                    const caseContent = await readFile(casePath, 'utf-8');
                    const caseData = JSON.parse(caseContent) as QualityCase;

                    const cacheKey = `extraction:${caseData.id}`;
                    let result;

                    if (useCache && cache.has(cacheKey)) {
                        result = cache.get(cacheKey)!.result;
                        cacheHits++;
                    } else {
                        const extracted = await extractionEngine.extract(caseData.input);
                        const { precision, recall, f1, details } = evaluateExtraction(
                            caseData.input,
                            caseData.expected as ExtractionExpectation[],
                            caseData.forbidden as ExtractionExpectation[],
                            extracted
                        );
                        result = {
                            caseId: caseData.id,
                            qualityFamily: 'extraction',
                            metrics: { precision, recall, f1 },
                            details,
                            success: true,
                        };
                        cacheMisses++;
                        if (useCache) {
                            cache.set(cacheKey, { caseId: caseData.id, providerHash, result, timestamp });
                        }
                    }

                    extractionResults.push(result);
                }

                const extractionPassed = extractionResults.filter(r => r.metrics.f1! >= passThreshold).length;
                const avgPrecision = extractionResults.reduce((sum, r) => sum + (r.metrics.precision ?? 0), 0) / (extractionResults.length || 1);
                const avgRecall = extractionResults.reduce((sum, r) => sum + (r.metrics.recall ?? 0), 0) / (extractionResults.length || 1);
                const avgF1 = extractionResults.reduce((sum, r) => sum + (r.metrics.f1 ?? 0), 0) / (extractionResults.length || 1);

                qualityExtractionResult = {
                    total: extractionResults.length,
                    passed: extractionPassed,
                    avgPrecision,
                    avgRecall,
                    avgF1,
                    caseResults: extractionResults,
                };
                this.printInfo(`Quality Extraction: ${extractionPassed}/${extractionResults.length} passed, avg F1: ${avgF1.toFixed(3)}`);

                // --- Match Quality ---
                const matchEngine = new MatchEngine(getOntologyArray());
                const candidateNotesByPrefix = new Map<string, Note[]>();
                for (const note of QUALITY_CASE_NOTES) {
                    const prefix = note.id.split('-')[1];
                    if (!candidateNotesByPrefix.has(prefix)) {
                        candidateNotesByPrefix.set(prefix, []);
                    }
                    candidateNotesByPrefix.get(prefix)!.push(note);
                }

                const prefixMap: Record<string, string> = {
                    '001': 'ramp', '002': 'dog', '003': 'piano', '004': 'ride',
                    '005': 'move', '006': 'meal', '007': 'donate', '008': 'spanish',
                    '009': 'sitter', '010': 'mentor', '011': 'photo', '012': 'drive',
                    '013': 'tech', '014': 'mentor', '015': 'photo', '016': 'drive',
                    '017': 'tech', '018': 'donate', '019': 'clean', '020': 'resume',
                    '021': 'grocery', '022': 'legal',
                };

                const matchCasesToRun = matchCases.slice(0, matchLimit);
                const matchResults = [];

                this.printInfo(`Running ${matchCasesToRun.length} match quality cases...`);

                for (const caseRef of matchCasesToRun) {
                    const casePath = join(projectRoot, 'data', 'eval', 'cases', caseRef.path);
                    const caseContent = await readFile(casePath, 'utf-8');
                    const caseData = JSON.parse(caseContent) as QualityCase;

                    const cacheKey = `match:${caseData.id}`;
                    let result;

                    if (useCache && cache.has(cacheKey)) {
                        result = cache.get(cacheKey)!.result;
                        cacheHits++;
                    } else {
                        const pipeline = new ExtractionPipeline();
                        const extractionResult = await pipeline.extract(caseData.input, getOntologyArray(), {
                            intents: true, patterns: true, ontologyKeys: true, fuzzy: true, price: true, dates: true, roles: true,
                        });
                        const requestNote = createNote({
                            id: `request-${caseData.id}`,
                            properties: extractionResult.properties,
                        });

                        const caseNum = caseData.id.split('-')[2];
                        const prefix = prefixMap[caseNum];
                        const candidateNotes = prefix ? candidateNotesByPrefix.get(prefix) || [] : [];

                        const matchResultsRaw = candidateNotes.map(offerNote => {
                            const result = matchEngine.calculateMatchScore(requestNote, offerNote);
                            return { note: offerNote, score: result.score };
                        });

                        const actual = matchResultsRaw
                            .filter(m => m.score >= 0.3)
                            .map(m => ({ noteId: m.note.id, score: m.score }));

                        const { precision, recall, f1, details } = evaluateMatch(
                            caseData.expected as MatchExpectation[],
                            actual
                        );

                        result = {
                            caseId: caseData.id,
                            qualityFamily: 'match',
                            metrics: { precision, recall, f1 },
                            details,
                            success: true,
                        };
                        cacheMisses++;
                        if (useCache) {
                            cache.set(cacheKey, { caseId: caseData.id, providerHash, result, timestamp });
                        }
                    }

                    matchResults.push(result);
                }

                const matchPassed = matchResults.filter(r => r.metrics.f1! >= passThreshold).length;
                const matchAvgPrecision = matchResults.reduce((sum, r) => sum + (r.metrics.precision ?? 0), 0) / (matchResults.length || 1);
                const matchAvgRecall = matchResults.reduce((sum, r) => sum + (r.metrics.recall ?? 0), 0) / (matchResults.length || 1);
                const matchAvgF1 = matchResults.reduce((sum, r) => sum + (r.metrics.f1 ?? 0), 0) / (matchResults.length || 1);

                qualityMatchResult = {
                    total: matchResults.length,
                    passed: matchPassed,
                    avgPrecision: matchAvgPrecision,
                    avgRecall: matchAvgRecall,
                    avgF1: matchAvgF1,
                    caseResults: matchResults,
                };
                this.printInfo(`Quality Match: ${matchPassed}/${matchResults.length} passed, avg F1: ${matchAvgF1.toFixed(3)}`);
            }

            // Save cache
            if (useCache && cacheMisses > 0) {
                await saveCache(cacheDir, providerHash, cache);
                this.printInfo(`Cache updated: ${cacheHits} hits, ${cacheMisses} misses`);
            }

            // --- Summary ---
            const result: EvalLocalResult = {
                timestamp,
                golden: goldenResult,
                quality: {
                    extraction: qualityExtractionResult,
                    match: qualityMatchResult,
                },
                cacheHits,
                cacheMisses,
            };

            // Write report
            await mkdir(outputDir, { recursive: true });
            const reportPath = join(outputDir, `local-eval-${timestamp.replace(/[:.]/g, '-')}.json`);
            await writeFile(reportPath, JSON.stringify(result, null, 2));

            if (args.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                this.printSummary(result, reportPath, passThreshold);
            }

            const goldenPassed = args.qualityOnly || goldenResult.passed >= 9;
            const qualityPassed = args.goldenOnly || (qualityExtractionResult.avgF1 >= passThreshold && qualityMatchResult.avgF1 >= passThreshold);
            return (goldenPassed && qualityPassed) ? 0 : 1;

        } catch (error) {
            return this.handleError(error, 'Local evaluation failed');
        }
    }

    private createProvider(name: string, options: LlamaCppProviderOptions, fewShotBank?: LabelledCase[]): Provider {
        switch (name) {
            case 'llama-cpp-embedded':
                return new NewLlamaCppProvider({ ...options, fewShotBank, serverUrl: undefined });
            case 'llama-cpp-server':
                return new NewLlamaCppProvider({ ...options, fewShotBank, modelPath: undefined });
            case 'deterministic':
            default:
                return new DeterministicProvider();
        }
    }

    private createExtractionEngine(
        providerName: string,
        options: LlamaCppProviderOptions
    ): { extract: (input: string) => Promise<Record<string, string[]>> } {
        const provider = this.createProvider(providerName, options, undefined);

        return {
            async extract(input: string): Promise<Record<string, string[]>> {
                const props = await provider.extract(input, getOntologyArray());
                const extracted: Record<string, string[]> = {};
                for (const prop of props) {
                    extracted[prop.key] = prop.values;
                }
                return extracted;
            },
        };
    }

    private printSummary(result: EvalLocalResult, reportPath: string, passThreshold: number): void {
        console.log('\n' + '='.repeat(70));
        console.log('📊 LOCAL EVALUATION REPORT');
        console.log('='.repeat(70));
        console.log(`Timestamp: ${result.timestamp}`);
        console.log(`Report: ${reportPath}`);
        console.log(`Cache: ${result.cacheHits} hits, ${result.cacheMisses} misses`);
        console.log('');

        if (result.golden.total > 0) {
            console.log('📋 GOLDEN GATE');
            console.log(`   ${result.golden.passed}/${result.golden.total} passed (need ≥9)`);
            console.log(`   Mean F1: ${result.golden.meanF1.toFixed(3)}`);
            console.log(`   Gate: ${result.golden.passed >= 9 ? '✅ PASSED' : '❌ FAILED'}`);
            console.log('');
        }

        if (result.quality.extraction.total > 0) {
            console.log('🔬 QUALITY EXTRACTION');
            console.log(`   ${result.quality.extraction.passed}/${result.quality.extraction.total} cases F1 ≥ ${passThreshold}`);
            console.log(`   Avg Precision: ${result.quality.extraction.avgPrecision.toFixed(3)}`);
            console.log(`   Avg Recall:    ${result.quality.extraction.avgRecall.toFixed(3)}`);
            console.log(`   Avg F1:        ${result.quality.extraction.avgF1.toFixed(3)}`);
            console.log(`   Gate: ${result.quality.extraction.avgF1 >= passThreshold ? '✅ PASSED' : '❌ FAILED'}`);
            console.log('');
        }

        if (result.quality.match.total > 0) {
            console.log('🔗 QUALITY MATCH');
            console.log(`   ${result.quality.match.passed}/${result.quality.match.total} cases F1 ≥ ${passThreshold}`);
            console.log(`   Avg Precision: ${result.quality.match.avgPrecision.toFixed(3)}`);
            console.log(`   Avg Recall:    ${result.quality.match.avgRecall.toFixed(3)}`);
            console.log(`   Avg F1:        ${result.quality.match.avgF1.toFixed(3)}`);
            console.log(`   Gate: ${result.quality.match.avgF1 >= passThreshold ? '✅ PASSED' : '❌ FAILED'}`);
            console.log('');
        }

        const overallPass = 
            (result.golden.total === 0 || result.golden.passed >= 9) &&
            (result.quality.extraction.total === 0 || result.quality.extraction.avgF1 >= passThreshold) &&
            (result.quality.match.total === 0 || result.quality.match.avgF1 >= passThreshold);

        console.log(`OVERALL: ${overallPass ? '✅ ALL GATES PASSED' : '❌ SOME GATES FAILED'}`);
        console.log('='.repeat(70));
    }
}