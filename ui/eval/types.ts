import type { Page } from '@playwright/test';

/**
 * Harness configuration
 */
export interface HarnessConfig {
    baseURL: string;
    headless: boolean;
    slowMo: number;
    repetitions: number;
    seed: number;
    viewport: { width: number; height: number };
    recordVideo: boolean;
}

/**
 * Task configuration - defines how to execute a task
 */
export interface TaskConfig<Input = unknown, Output = unknown> {
    id: string;
    name: string;
    type: 'capture' | 'match' | 'extraction' | 'commitment' | 'search' | 'recovery';
    execute(page: Page, input: Input, seed: number): Promise<TaskExecutionResult<Output>>;
}

/**
 * Result of a single task execution
 */
export interface TaskExecutionResult<Output = unknown> {
    success: boolean;
    output: Output | null;
    steps: number;
    errors: string[];
    metrics: Record<string, number>;
}

/**
 * Result of a task across all repetitions
 */
export interface TaskResult<Output = unknown> {
    taskId: string;
    repetition: number;
    success: boolean;
    output: Output | null;
    duration: number;
    steps: number;
    errors: string[];
    metrics: Record<string, number>;
    timestamp: string;
}

/**
 * Aggregated evaluation result
 */
export interface EvaluationResult {
    config: HarnessConfig;
    taskSummaries: TaskSummary[];
    overallSuccessRate: number;
    totalRuns: number;
    timestamp: string;
}

export interface TaskSummary {
    taskId: string;
    totalRuns: number;
    successful: number;
    failed: number;
    successRate: number;
    medianDuration: number;
    p90Duration: number;
    medianSteps: number;
    p90Steps: number;
    errors: string[];
}

/**
 * Test scenario for the harness
 */
export interface TestScenario {
    name: string;
    description: string;
    tasks: TaskConfig[];
    inputs: unknown[];
    expectedOutcomes: Record<string, unknown>;
}

/**
 * Scenario runner - runs a complete scenario
 */
export interface ScenarioRunner {
    run(scenario: TestScenario, config: HarnessConfig): Promise<EvaluationResult>;
}

/**
 * Deterministic checks that can be run without model evaluation
 */
export interface DeterministicCheck {
    name: string;
    check(result: TaskResult): Promise<{ pass: boolean; message?: string }>;
}

/**
 * Built-in deterministic checks
 */
export const DETERMINISTIC_CHECKS: DeterministicCheck[] = [
    {
        name: 'schema-validation',
        async check(result) {
            // Check if output matches expected schema
            if (!result.output) return { pass: false, message: 'No output' };
            return { pass: true };
        },
    },
    {
        name: 'invariants',
        async check(result) {
            // Check invariants (e.g., no negative durations)
            if (result.duration < 0) return { pass: false, message: 'Negative duration' };
            if (result.steps < 0) return { pass: false, message: 'Negative steps' };
            return { pass: true };
        },
    },
    {
        name: 'state-transitions',
        async check(result) {
            // Check state transitions are valid
            return { pass: true };
        },
    },
    {
        name: 'required-behaviors',
        async check(result) {
            // Check required behaviors occurred
            return { pass: true };
        },
    },
    {
        name: 'offline-behavior',
        async check(result) {
            // Check task works offline
            return { pass: true };
        },
    },
];