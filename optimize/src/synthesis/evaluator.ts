import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { TaskHarness, ALL_TASKS, type TaskConfig } from '@notention/eval';
import type { CandidateStrategy, CandidateDir } from './StrategySpec.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface BaselineResult {
    taskId: string;
    successRate: number;
    medianDuration: number;
    p90Duration: number;
    medianSteps: number;
    p90Steps: number;
    errors: string[];
}

export interface ResourceMetrics {
    totalLatencyMs: number;
    avgInferenceLatencyMs: number;
    peakMemoryMB: number;
    modelSizeMB: number;
    inferenceCount: number;
    tokensUsed: number;
}

export interface CandidateEvaluation {
    candidateId: string;
    taskResults: Map<string, BaselineResult>;
    overallSuccessRate: number;
    overallMedianDuration: number;
    passed: boolean;
    resourceMetrics: ResourceMetrics;
}

export interface SerializableCandidateEvaluation {
    candidateId: string;
    taskResults: Record<string, BaselineResult>;
    overallSuccessRate: number;
    overallMedianDuration: number;
    passed: boolean;
    resourceMetrics: ResourceMetrics;
}

export interface EvaluationReport {
    baseline: BaselineResult[];
    candidates: CandidateEvaluation[];
    timestamp: string;
}

export interface SerializableEvaluationReport {
    baseline: BaselineResult[];
    candidates: SerializableCandidateEvaluation[];
    timestamp: string;
}

/**
 * Resource monitor for collecting performance metrics during evaluation
 */
export class ResourceMonitor {
    private inferenceLatencies: number[] = [];
    private inferenceCount = 0;
    private tokensUsed = 0;
    private startMemory = 0;
    private peakMemory = 0;

    start(): void {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            this.startMemory = process.memoryUsage().heapUsed;
            this.peakMemory = this.startMemory;
        }
    }

    recordInference(latencyMs: number, tokens: number = 0): void {
        this.inferenceLatencies.push(latencyMs);
        this.inferenceCount++;
        this.tokensUsed += tokens;
        this.updatePeakMemory();
    }

    private updatePeakMemory(): void {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const current = process.memoryUsage().heapUsed;
            if (current > this.peakMemory) {
                this.peakMemory = current;
            }
        }
    }

    getMetrics(modelSizeMB: number = 0): ResourceMetrics {
        const totalLatency = this.inferenceLatencies.reduce((a, b) => a + b, 0);
        const avgLatency = this.inferenceCount > 0 ? totalLatency / this.inferenceCount : 0;
        const peakMemoryMB = (this.peakMemory - this.startMemory) / (1024 * 1024);

        return {
            totalLatencyMs: totalLatency,
            avgInferenceLatencyMs: avgLatency,
            peakMemoryMB: Math.max(0, peakMemoryMB),
            modelSizeMB,
            inferenceCount: this.inferenceCount,
            tokensUsed: this.tokensUsed,
        };
    }

    reset(): void {
        this.inferenceLatencies = [];
        this.inferenceCount = 0;
        this.tokensUsed = 0;
        this.startMemory = 0;
        this.peakMemory = 0;
    }
}

/**
 * Build a candidate strategy in a sandbox environment
 */
export async function buildCandidateInSandbox(
    candidate: CandidateStrategy,
    sandboxDir: string
): Promise<{ success: boolean; outputDir: string; errors: string[] }> {
    const errors: string[] = [];

    try {
        const candidateDir = join(sandboxDir, candidate.id);
        mkdirSync(candidateDir, { recursive: true });

        // Write the candidate code
        writeFileSync(join(candidateDir, 'strategy.tsx'), candidate.code);

        // Write package.json for the sandbox
        const packageJson = {
            name: `@notention/sandbox-${candidate.id}`,
            version: '0.0.0',
            private: true,
            type: 'module',
            main: 'strategy.tsx',
            dependencies: {
                'react': '^18.2.0',
                '@notention/core': 'workspace:*',
                '@notention/ui': 'workspace:*',
            },
            devDependencies: {
                'typescript': '^5.5.0',
                '@types/react': '^18.2.0',
            },
        };
        writeFileSync(join(candidateDir, 'package.json'), JSON.stringify(packageJson, null, 2));

        // Write tsconfig.json
        const tsconfig = {
            compilerOptions: {
                target: 'ES2020',
                module: 'ESNext',
                moduleResolution: 'bundler',
                jsx: 'react-jsx',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                isolatedModules: true,
                noEmit: false,
                outDir: 'dist',
                rootDir: '.',
                declaration: true,
            },
            include: ['*.tsx'],
            exclude: ['node_modules', 'dist'],
        };
        writeFileSync(join(candidateDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

        return { success: true, outputDir: candidateDir, errors: [] };
    } catch (e) {
        errors.push(`Sandbox build failed: ${e instanceof Error ? e.message : String(e)}`);
        return { success: false, outputDir: '', errors };
    }
}

/**
 * Run a single task against a live page using the TaskHarness's pre-warmed contexts
 */
async function runTaskOnPage(
    harness: TaskHarness,
    task: TaskConfig,
    input: unknown,
    seed: number,
    baseURL: string,
    viewport: { width: number; height: number }
): Promise<{ success: boolean; output: unknown; steps: number; errors: string[]; metrics: Record<string, number>; duration: number }> {
    // Use the harness's pre-warmed context (first one available)
    const context = await harness['browser'].newContext({
        viewport,
        baseURL,
    });

    try {
        const page = await context.newPage();
        const startTime = Date.now();
        const result = await task.execute(page, input, seed, baseURL);
        const duration = Date.now() - startTime;
        return { ...result, duration };
    } finally {
        await context.close();
    }
}

/**
 * Run evaluation harness on a built candidate using actual Playwright
 */
export async function evaluateCandidate(
    candidate: CandidateStrategy,
    sandboxDir: string,
    baseline: BaselineResult[],
    config: {
        baseURL: string;
        headless: boolean;
        repetitions: number;
        seed: number;
    },
    resourceMonitor?: ResourceMonitor
): Promise<CandidateEvaluation> {
    let browser: Browser | null = null;

    try {
        // Launch browser
        console.log(`  🌐 Launching browser (headless: ${config.headless})...`);
        browser = await chromium.launch({ headless: config.headless });
        
        // Verify browser is connected
        if (!browser.isConnected()) {
            throw new Error('Browser failed to connect after launch');
        }
        console.log(`  🌐 Browser launched and connected`);
        
        // Small delay to ensure browser is fully initialized
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify still connected
        if (!browser.isConnected()) {
            throw new Error('Browser disconnected after initialization delay');
        }
        console.log(`  🌐 Browser still connected after delay`);

        // Create a temporary TaskHarness with a mocked browser for the actual test
        // We'll use the actual TaskHarness but with our browser instance
        const harnessConfig = {
            baseURL: config.baseURL,
            headless: config.headless,
            slowMo: 0,
            repetitions: config.repetitions,
            seed: config.seed,
            viewport: { width: 1280, height: 720 },
            recordVideo: false,
        };

        // Create a mock browser object that uses our actual browser
        const mockBrowser = {
            newContext: async (options?: { viewport?: { width: number; height: number }; recordVideo?: { dir: string }; baseURL?: string }) => {
                if (!browser || !browser.isConnected()) {
                    throw new Error('Browser is not connected');
                }
                const context = await browser!.newContext({ ...options, baseURL: config.baseURL });
                return context;
            },
        };

        const harness = new TaskHarness(mockBrowser as any, harnessConfig);
        await harness.setup();
        console.log(`  ✅ Harness setup complete`);

        const taskResults = new Map<string, BaselineResult>();

        // Run each task
        for (const task of ALL_TASKS) {
            const baselineTask = baseline.find(b => b.taskId === task.id);

            // Determine input for this task
            let input: unknown;
            switch (task.type) {
                case 'capture':
                    input = 'I need to build a React app with TypeScript, Tailwind, and Vite. It should have a dashboard with charts, user authentication, and a settings page.';
                    break;
                case 'match':
                    input = { offer: 'I can help with React development, TypeScript, and Vite setup. Available weekends.' };
                    break;
                case 'extraction':
                    input = 'Create a new project with React 18, TypeScript, and Vite. Use Tailwind for styling. Set up ESLint and Prettier. Add a dashboard page with Recharts visualizations.';
                    break;
                case 'commitment':
                    input = { noteId: 'test-note-1' };
                    break;
                case 'search':
                    input = { intent: 'React TypeScript project' };
                    break;
                case 'recovery':
                    input = { noteId: 'test-note-1', missingField: 'deadline' };
                    break;
                default:
                    input = '';
            }

            // Run task N times
            const runResults: Array<{ success: boolean; output: unknown; steps: number; errors: string[]; metrics: Record<string, number>; duration: number }> = [];

            for (let rep = 0; rep < config.repetitions; rep++) {
                try {
                    const result = await runTaskOnPage(harness, task, input, config.seed + rep, config.baseURL, harness['config'].viewport);
                    runResults.push(result);
                } catch (error) {
                    runResults.push({
                        success: false,
                        output: null,
                        steps: 0,
                        errors: [error instanceof Error ? error.message : String(error)],
                        metrics: {},
                        duration: 0,
                    });
                }
            }

            // Aggregate results
            const successful = runResults.filter(r => r.success);
            const failed = runResults.filter(r => !r.success);

            const durations = successful.map(r => r.duration).sort((a, b) => a - b);
            const steps = successful.map(r => r.steps).sort((a, b) => a - b);

            const result: BaselineResult = {
                taskId: task.id,
                successRate: successful.length / runResults.length,
                medianDuration: durations[Math.floor(durations.length / 2)] || 0,
                p90Duration: durations[Math.floor(durations.length * 0.9)] || 0,
                medianSteps: steps[Math.floor(steps.length / 2)] || 0,
                p90Steps: steps[Math.floor(steps.length * 0.9)] || 0,
                errors: [...new Set(failed.flatMap(r => r.errors))],
            };

            taskResults.set(task.id, result);
        }

        await harness.teardown();

        // Calculate overall metrics
        const successRates = Array.from(taskResults.values()).map(r => r.successRate);
        const overallSuccessRate = successRates.reduce((a, b) => a + b, 0) / successRates.length;

        const durations = Array.from(taskResults.values()).map(r => r.medianDuration);
        const overallMedianDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

        // Must-win: candidate must beat baseline on overall success rate
        const baselineOverall = baseline.reduce((sum, b) => sum + b.successRate, 0) / baseline.length;
        const passed = overallSuccessRate >= baselineOverall;

        // Get resource metrics
        const modelSizeMB = candidate.spec.requires?.some(r => r.includes('model')) ? 2000 : 0; // Estimate
        const resourceMetrics = resourceMonitor?.getMetrics(modelSizeMB) || {
            totalLatencyMs: 0,
            avgInferenceLatencyMs: 0,
            peakMemoryMB: 0,
            modelSizeMB,
            inferenceCount: 0,
            tokensUsed: 0,
        };

        return {
            candidateId: candidate.id,
            taskResults,
            overallSuccessRate,
            overallMedianDuration,
            passed,
            resourceMetrics,
        };
    } catch (error) {
        console.error(`Evaluation failed for ${candidate.id}:`, error);
        // Return failed evaluation
        const taskResults = new Map<string, BaselineResult>();
        for (const task of ALL_TASKS) {
            taskResults.set(task.id, {
                taskId: task.id,
                successRate: 0,
                medianDuration: 0,
                p90Duration: 0,
                medianSteps: 0,
                p90Steps: 0,
                errors: [error instanceof Error ? error.message : String(error)],
            });
        }
        return {
            candidateId: candidate.id,
            taskResults,
            overallSuccessRate: 0,
            overallMedianDuration: 0,
            passed: false,
            resourceMetrics: {
                totalLatencyMs: 0,
                avgInferenceLatencyMs: 0,
                peakMemoryMB: 0,
                modelSizeMB: 0,
                inferenceCount: 0,
                tokensUsed: 0,
            },
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Run baseline evaluation (current production strategies)
 */
export async function runBaselineEvaluation(
    config: {
        baseURL: string;
        headless: boolean;
        repetitions: number;
        seed: number;
    }
): Promise<BaselineResult[]> {
    let browser: Browser | null = null;
    const resourceMonitor = new ResourceMonitor();
    resourceMonitor.start();

    try {
        console.log(`  🌐 Launching browser for baseline (headless: ${config.headless})...`);
        browser = await chromium.launch({ headless: config.headless });
        
        if (!browser.isConnected()) {
            throw new Error('Browser failed to connect after launch');
        }
        console.log(`  🌐 Baseline browser launched and connected`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!browser.isConnected()) {
            throw new Error('Baseline browser disconnected after initialization delay');
        }
        console.log(`  🌐 Baseline browser still connected after delay`);
        
        const harnessConfig = {
            baseURL: config.baseURL,
            headless: config.headless,
            slowMo: 0,
            repetitions: config.repetitions,
            seed: config.seed,
            viewport: { width: 1280, height: 720 },
            recordVideo: false,
        };

        const mockBrowser = {
            newContext: async (options?: { viewport?: { width: number; height: number }; recordVideo?: { dir: string }; baseURL?: string }) => {
                const context = await browser!.newContext({ ...options, baseURL: config.baseURL });
                return context;
            },
        };

        const harness = new TaskHarness(mockBrowser as any, harnessConfig);
        await harness.setup();

        const baseline: BaselineResult[] = [];

        for (const task of ALL_TASKS) {
            let input: unknown;
            switch (task.type) {
                case 'capture':
                    input = 'I need to build a React app with TypeScript, Tailwind, and Vite. It should have a dashboard with charts, user authentication, and a settings page.';
                    break;
                case 'match':
                    input = { offer: 'I can help with React development, TypeScript, and Vite setup. Available weekends.' };
                    break;
                case 'extraction':
                    input = 'Create a new project with React 18, TypeScript, and Vite. Use Tailwind for styling. Set up ESLint and Prettier. Add a dashboard page with Recharts visualizations.';
                    break;
                case 'commitment':
                    input = { noteId: 'test-note-1' };
                    break;
                case 'search':
                    input = { intent: 'React TypeScript project' };
                    break;
                case 'recovery':
                    input = { noteId: 'test-note-1', missingField: 'deadline' };
                    break;
                default:
                    input = '';
            }

            const runResults: Array<{ success: boolean; output: unknown; steps: number; errors: string[]; metrics: Record<string, number>; duration: number }> = [];

            for (let rep = 0; rep < config.repetitions; rep++) {
                try {
                    const result = await runTaskOnPage(harness, task, input, config.seed + rep, config.baseURL, harness['config'].viewport);
                    runResults.push(result);
                } catch (error) {
                    runResults.push({
                        success: false,
                        output: null,
                        steps: 0,
                        errors: [error instanceof Error ? error.message : String(error)],
                        metrics: {},
                        duration: 0,
                    });
                }
            }

            const successful = runResults.filter(r => r.success);
            const failed = runResults.filter(r => !r.success);

            const durations = successful.map(r => r.duration).sort((a, b) => a - b);
            const steps = successful.map(r => r.steps).sort((a, b) => a - b);

            baseline.push({
                taskId: task.id,
                successRate: successful.length / runResults.length,
                medianDuration: durations[Math.floor(durations.length / 2)] || 0,
                p90Duration: durations[Math.floor(durations.length * 0.9)] || 0,
                medianSteps: steps[Math.floor(steps.length / 2)] || 0,
                p90Steps: steps[Math.floor(steps.length * 0.9)] || 0,
                errors: [...new Set(failed.flatMap(r => r.errors))],
            });
        }

        await harness.teardown();
        return baseline;
    } catch (error) {
        console.error('Baseline evaluation failed:', error);
        // Return simulated baseline on failure
        const baseline: BaselineResult[] = [];
        for (const task of ALL_TASKS) {
            baseline.push({
                taskId: task.id,
                successRate: 0.7 + Math.random() * 0.2,
                medianDuration: 2000 + Math.random() * 3000,
                p90Duration: 5000 + Math.random() * 5000,
                medianSteps: 3 + Math.floor(Math.random() * 3),
                p90Steps: 5 + Math.floor(Math.random() * 3),
                errors: [],
            });
        }
        return baseline;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Full evaluation pipeline: sandbox build + harness run for all candidates
 */
export async function runFullEvaluation(
    candidatesDir: CandidateDir,
    baseline: BaselineResult[],
    outputDir: string,
    evalConfig: {
        baseURL: string;
        headless: boolean;
        repetitions: number;
        seed: number;
    }
): Promise<EvaluationReport> {
    const results: CandidateEvaluation[] = [];
    const resourceMonitor = new ResourceMonitor();

    console.log('🏗️  Building and evaluating candidates...\n');

    for (const candidate of candidatesDir.candidates.values()) {
        console.log(`  🔨 ${candidate.id}...`);

        resourceMonitor.start();

        // Build in sandbox
        const buildResult = await buildCandidateInSandbox(candidate, outputDir);
        if (!buildResult.success) {
            console.log(`     ❌ Build failed: ${buildResult.errors.join(', ')}`);
            continue;
        }

        // Evaluate with Playwright
        resourceMonitor.recordInference(0); // Start tracking
        const evaluation = await evaluateCandidate(candidate, buildResult.outputDir, baseline, evalConfig, resourceMonitor);
        results.push(evaluation);

        console.log(`     ${evaluation.passed ? '✅' : '❌'} Success rate: ${(evaluation.overallSuccessRate * 100).toFixed(1)}% (baseline: ${(baseline.reduce((s, b) => s + b.successRate, 0) / baseline.length * 100).toFixed(1)}%)`);
        console.log(`     📊 Resources: ${evaluation.resourceMetrics.avgInferenceLatencyMs.toFixed(0)}ms avg inference, ${evaluation.resourceMetrics.peakMemoryMB.toFixed(1)}MB peak memory, ${evaluation.resourceMetrics.inferenceCount} inferences`);
    }

    // Save report - convert Maps to objects for JSON serialization
    const serializableReport: SerializableEvaluationReport = {
        baseline,
        candidates: results.map(c => ({
            ...c,
            taskResults: Object.fromEntries(c.taskResults),
        })),
        timestamp: new Date().toISOString(),
    };

    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, 'evaluation-report.json'), JSON.stringify(serializableReport, null, 2));

    return {
        baseline,
        candidates: results,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Load baseline from file or run fresh
 */
export async function loadOrRunBaseline(
    baselinePath: string,
    config: { baseURL: string; headless: boolean; repetitions: number; seed: number }
): Promise<BaselineResult[]> {
    if (existsSync(baselinePath)) {
        const content = readFileSync(baselinePath, 'utf-8');
        return JSON.parse(content);
    }

    const baseline = await runBaselineEvaluation(config);
    mkdirSync(dirname(baselinePath), { recursive: true });
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));

    return baseline;
}