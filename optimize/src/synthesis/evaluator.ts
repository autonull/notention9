import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
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

export interface CandidateEvaluation {
    candidateId: string;
    taskResults: Map<string, BaselineResult>;
    overallSuccessRate: number;
    overallMedianDuration: number;
    passed: boolean;  // must-win vs baseline
}

// Serializable version of CandidateEvaluation for JSON output
export interface SerializableCandidateEvaluation {
    candidateId: string;
    taskResults: Record<string, BaselineResult>;
    overallSuccessRate: number;
    overallMedianDuration: number;
    passed: boolean;
}

export interface EvaluationReport {
    baseline: BaselineResult[];
    candidates: CandidateEvaluation[];
    timestamp: string;
}

// Serializable version of EvaluationReport for JSON output
export interface SerializableEvaluationReport {
    baseline: BaselineResult[];
    candidates: SerializableCandidateEvaluation[];
    timestamp: string;
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
        
        // In a real implementation, we'd run pnpm install && pnpm build here
        // For now, we just return success
        return { success: true, outputDir: candidateDir, errors: [] };
    } catch (e) {
        errors.push(`Sandbox build failed: ${e instanceof Error ? e.message : String(e)}`);
        return { success: false, outputDir: '', errors };
    }
}

/**
 * Run evaluation harness on a built candidate
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
    }
): Promise<CandidateEvaluation> {
    // In a real implementation, this would:
    // 1. Start a dev server with the candidate strategy
    // 2. Run the TaskHarness against it
    // 3. Collect metrics
    
    // For now, simulate evaluation results
    const taskResults = new Map<string, BaselineResult>();
    
    // Simulate results for each task
    for (const task of ALL_TASKS) {
        const baselineTask = baseline.find(b => b.taskId === task.id);
        
        // Simulate: candidate performs slightly better or worse than baseline
        const variance = (Math.random() - 0.5) * 0.2; // ±10%
        
        const result: BaselineResult = {
            taskId: task.id,
            successRate: Math.max(0, Math.min(1, (baselineTask?.successRate || 0.5) + variance)),
            medianDuration: Math.max(100, Math.round((baselineTask?.medianDuration || 1000) * (1 + variance))),
            p90Duration: Math.max(100, Math.round((baselineTask?.p90Duration || 2000) * (1 + variance))),
            medianSteps: Math.max(1, Math.round((baselineTask?.medianSteps || 3) * (1 + variance))),
            p90Steps: Math.max(1, Math.round((baselineTask?.p90Steps || 5) * (1 + variance))),
            errors: [],
        };
        
        taskResults.set(task.id, result);
    }
    
    // Calculate overall metrics
    const successRates = Array.from(taskResults.values()).map(r => r.successRate);
    const overallSuccessRate = successRates.reduce((a, b) => a + b, 0) / successRates.length;
    
    const durations = Array.from(taskResults.values()).map(r => r.medianDuration);
    const overallMedianDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    // Must-win: candidate must beat baseline on overall success rate
    const baselineOverall = baseline.reduce((sum, b) => sum + b.successRate, 0) / baseline.length;
    const passed = overallSuccessRate >= baselineOverall;
    
    return {
        candidateId: candidate.id,
        taskResults,
        overallSuccessRate,
        overallMedianDuration,
        passed,
    };
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
    // In a real implementation, this would run the harness against the current production build
    // For now, return simulated baseline results
    const baseline: BaselineResult[] = [];
    
    for (const task of ALL_TASKS) {
        baseline.push({
            taskId: task.id,
            successRate: 0.7 + Math.random() * 0.2, // 70-90%
            medianDuration: 2000 + Math.random() * 3000,
            p90Duration: 5000 + Math.random() * 5000,
            medianSteps: 3 + Math.floor(Math.random() * 3),
            p90Steps: 5 + Math.floor(Math.random() * 3),
            errors: [],
        });
    }
    
    return baseline;
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
    
    console.log('🏗️  Building and evaluating candidates...\n');
    
    for (const candidate of candidatesDir.candidates.values()) {
        console.log(`  🔨 ${candidate.id}...`);
        
        // Build in sandbox
        const buildResult = await buildCandidateInSandbox(candidate, outputDir);
        if (!buildResult.success) {
            console.log(`     ❌ Build failed: ${buildResult.errors.join(', ')}`);
            continue;
        }
        
        // Evaluate
        const evaluation = await evaluateCandidate(candidate, buildResult.outputDir, baseline, evalConfig);
        results.push(evaluation);
        
        console.log(`     ${evaluation.passed ? '✅' : '❌'} Success rate: ${(evaluation.overallSuccessRate * 100).toFixed(1)}% (baseline: ${(baseline.reduce((s, b) => s + b.successRate, 0) / baseline.length * 100).toFixed(1)}%)`);
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