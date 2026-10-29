import { test as base, type Page, type BrowserContext } from '@playwright/test';
import type { TaskResult, TaskConfig, EvaluationResult, HarnessConfig } from './types.js';

/**
 * Test fixtures for the evaluation harness
 */
interface HarnessFixtures {
    harness: TaskHarness;
    config: HarnessConfig;
}

export const test = base.extend<HarnessFixtures>({
    config: async ({}, use) => {
        const config: HarnessConfig = {
            baseURL: process.env.EVAL_BASE_URL || 'http://localhost:5173',
            headless: process.env.EVAL_HEADLESS !== 'false',
            slowMo: parseInt(process.env.EVAL_SLOWMO || '0'),
            repetitions: parseInt(process.env.EVAL_REPS || '10'),
            seed: parseInt(process.env.EVAL_SEED || '42'),
            viewport: { width: 1280, height: 720 },
            recordVideo: process.env.EVAL_VIDEO === 'true',
        };
        await use(config);
    },

    harness: async ({ config, browser }, use) => {
        const harness = new TaskHarness(browser, config);
        await harness.setup();
        await use(harness);
        await harness.teardown();
    },
});

export { expect } from '@playwright/test';

/**
 * Main task harness for running evaluation tasks
 */
export class TaskHarness {
    private browser: any;
    private config: HarnessConfig;
    private contexts: BrowserContext[] = [];
    private results: TaskResult[] = [];

    constructor(browser: any, config: HarnessConfig) {
        this.browser = browser;
        this.config = config;
    }

    async setup(): Promise<void> {
        // Pre-warm contexts for each repetition
        for (let i = 0; i < this.config.repetitions; i++) {
            const context = await this.browser.newContext({
                viewport: this.config.viewport,
                recordVideo: this.config.recordVideo ? { dir: `eval/videos/rep-${i}` } : undefined,
            });
            this.contexts.push(context);
        }
    }

    async teardown(): Promise<void> {
        for (const context of this.contexts) {
            await context.close();
        }
        this.contexts = [];
    }

    /**
     * Run a task N times and collect results
     */
    async runTask<Input, Output>(
        task: TaskConfig<Input, Output>,
        input: Input
    ): Promise<TaskResult<Output>[]> {
        const results: TaskResult<Output>[] = [];

        for (let rep = 0; rep < this.config.repetitions; rep++) {
            const context = this.contexts[rep];
            const page = await context.newPage();
            
            try {
                const startTime = Date.now();
                const result = await task.execute(page, input, this.config.seed + rep);
                const duration = Date.now() - startTime;

                results.push({
                    taskId: task.id,
                    repetition: rep,
                    success: result.success,
                    output: result.output,
                    duration,
                    steps: result.steps || 0,
                    errors: result.errors || [],
                    metrics: result.metrics || {},
                    timestamp: new Date().toISOString(),
                });
            } catch (error) {
                results.push({
                    taskId: task.id,
                    repetition: rep,
                    success: false,
                    output: null,
                    duration: 0,
                    steps: 0,
                    errors: [error instanceof Error ? error.message : String(error)],
                    metrics: {},
                    timestamp: new Date().toISOString(),
                });
            } finally {
                await page.close();
            }
        }

        this.results.push(...results);
        return results;
    }

    /**
     * Run multiple tasks in sequence
     */
    async runTasks<Input, Output>(
        tasks: TaskConfig<Input, Output>[],
        inputs: Input[]
    ): Promise<TaskResult<Output>[]> {
        const allResults: TaskResult<Output>[] = [];

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const input = inputs[i];
            const results = await this.runTask(task, input);
            allResults.push(...results);
        }

        return allResults;
    }

    /**
     * Aggregate results across repetitions
     */
    aggregate(results: TaskResult[]): EvaluationResult {
        const byTask = new Map<string, TaskResult[]>();
        
        for (const r of results) {
            if (!byTask.has(r.taskId)) byTask.set(r.taskId, []);
            byTask.get(r.taskId)!.push(r);
        }

        const taskSummaries: EvaluationResult['taskSummaries'] = [];

        for (const [taskId, taskResults] of byTask) {
            const successful = taskResults.filter(r => r.success);
            const failed = taskResults.filter(r => !r.success);

            const durations = successful.map(r => r.duration).sort((a, b) => a - b);
            const steps = successful.map(r => r.steps).sort((a, b) => a - b);

            taskSummaries.push({
                taskId,
                totalRuns: taskResults.length,
                successful: successful.length,
                failed: failed.length,
                successRate: successful.length / taskResults.length,
                medianDuration: durations[Math.floor(durations.length / 2)] || 0,
                p90Duration: durations[Math.floor(durations.length * 0.9)] || 0,
                medianSteps: steps[Math.floor(steps.length / 2)] || 0,
                p90Steps: steps[Math.floor(steps.length * 0.9)] || 0,
                errors: [...new Set(failed.flatMap(r => r.errors))],
            });
        }

        const overallSuccessRate = taskSummaries.reduce((sum, t) => sum + t.successRate, 0) / taskSummaries.length;

        return {
            config: this.config,
            taskSummaries,
            overallSuccessRate,
            totalRuns: results.length,
            timestamp: new Date().toISOString(),
        };
    }

    getResults(): TaskResult[] {
        return this.results;
    }
}

/**
 * Built-in task configurations for the 6 core tasks
 */

// Task 1: Capture need with ≥3 properties in <20s
export const captureTask: TaskConfig<string, { properties: any[]; time: number }> = {
    id: 'task-1-capture',
    name: 'Capture need with ≥3 properties in <20s',
    type: 'capture',
    async execute(page, input, seed) {
        await page.goto('/capture');
        await page.waitForLoadState('networkidle');

        const startTime = Date.now();
        let steps = 0;
        const errors: string[] = [];

        // Type the input
        const editor = page.locator('[data-testid="capture-editor"], textarea, [contenteditable="true"]').first();
        await editor.fill(input);
        steps++;

        // Wait for extraction to complete
        await page.waitForTimeout(1000);
        steps++;

        // Count extracted properties
        const properties = await page.locator('[data-testid="extracted-property"]').count();
        steps++;

        // Check if we have ≥3 properties
        const hasMinProperties = properties >= 3;
        const time = Date.now() - startTime;
        const withinTimeLimit = time < 20000;

        return {
            success: hasMinProperties && withinTimeLimit,
            output: { properties: [], time }, // Would extract actual properties
            steps,
            errors: hasMinProperties ? [] : ['Less than 3 properties extracted'],
            metrics: { propertiesExtracted: properties, time },
        };
    },
};

// Task 2: Capture offer → ≥1 match without re-edit
export const matchTask: TaskConfig<{ offer: string }, { matches: number; reedited: boolean }> = {
    id: 'task-2-match',
    name: 'Capture offer → ≥1 match without re-edit',
    type: 'match',
    async execute(page, input, seed) {
        await page.goto('/capture');
        await page.waitForLoadState('networkidle');

        let steps = 0;
        const errors: string[] = [];

        // Enter offer
        const editor = page.locator('[data-testid="capture-editor"], textarea, [contenteditable="true"]').first();
        await editor.fill(input.offer);
        steps++;

        // Submit
        await page.click('[data-testid="submit-button"], button[type="submit"]');
        await page.waitForLoadState('networkidle');
        steps++;

        // Check for matches
        await page.waitForTimeout(2000);
        const matches = await page.locator('[data-testid="match-card"], [data-testid="match-result"]').count();
        steps++;

        // Check if re-edited (clicked edit button)
        const reedited = await page.locator('[data-testid="edit-button"]').isVisible().catch(() => false);

        return {
            success: matches >= 1 && !reedited,
            output: { matches, reedited },
            steps,
            errors: matches === 0 ? ['No matches found'] : [],
            metrics: { matches, reedited: reedited ? 1 : 0 },
        };
    },
};

// Task 3: Paragraph → valid structured note
export const extractionTask: TaskConfig<string, { valid: boolean; fields: number }> = {
    id: 'task-3-extraction',
    name: 'Paragraph → valid structured note',
    type: 'extraction',
    async execute(page, input, seed) {
        await page.goto('/capture');
        await page.waitForLoadState('networkidle');

        let steps = 0;
        const errors: string[] = [];

        const editor = page.locator('[data-testid="capture-editor"], textarea, [contenteditable="true"]').first();
        await editor.fill(input);
        steps++;

        await page.click('[data-testid="extract-button"], button:has-text("Extract")');
        await page.waitForLoadState('networkidle');
        steps++;

        // Check validation
        const valid = await page.locator('[data-testid="validation-pass"]').isVisible().catch(() => false);
        const fields = await page.locator('[data-testid="extracted-field"]').count();
        steps++;

        return {
            success: valid && fields >= 3,
            output: { valid, fields },
            steps,
            errors: !valid ? ['Validation failed'] : (fields < 3 ? ['Less than 3 fields'] : []),
            metrics: { valid: valid ? 1 : 0, fields },
        };
    },
};

// Task 4: Open note → commitment with status+deadline
export const commitmentTask: TaskConfig<{ noteId: string }, { hasStatus: boolean; hasDeadline: boolean }> = {
    id: 'task-4-commitment',
    name: 'Open note → commitment with status+deadline',
    type: 'commitment',
    async execute(page, input, seed) {
        await page.goto(`/notes/${input.noteId}`);
        await page.waitForLoadState('networkidle');

        let steps = 0;
        const errors: string[] = [];

        // Click add commitment
        await page.click('[data-testid="add-commitment"]');
        steps++;

        // Fill status
        await page.selectOption('[data-testid="status-select"]', 'open');
        steps++;

        // Fill deadline
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        await page.fill('[data-testid="deadline-input"]', tomorrow);
        steps++;

        await page.click('[data-testid="save-commitment"]');
        await page.waitForLoadState('networkidle');
        steps++;

        const hasStatus = await page.locator('[data-testid="commitment-status"]').textContent().then(t => t?.includes('open') ?? false);
        const hasDeadline = await page.locator('[data-testid="commitment-deadline"]').textContent().then(t => t?.includes(tomorrow) ?? false);

        return {
            success: hasStatus && hasDeadline,
            output: { hasStatus, hasDeadline },
            steps,
            errors: !hasStatus ? ['No status'] : !hasDeadline ? ['No deadline'] : [],
            metrics: { hasStatus: hasStatus ? 1 : 0, hasDeadline: hasDeadline ? 1 : 0 },
        };
    },
};

// Task 5: Find note by intent
export const searchTask: TaskConfig<{ intent: string }, { findsTarget: boolean }> = {
    id: 'task-5-search',
    name: 'Find note by intent',
    type: 'search',
    async execute(page, input, seed) {
        await page.goto('/search');
        await page.waitForLoadState('networkidle');

        let steps = 0;
        const errors: string[] = [];

        await page.fill('[data-testid="search-input"]', input.intent);
        steps++;

        await page.click('[data-testid="search-button"]');
        await page.waitForLoadState('networkidle');
        steps++;

        // Check if target note appears in results
        const findsTarget = await page.locator(`[data-testid="note-${input.intent}"]`).isVisible().catch(() => false);

        return {
            success: findsTarget,
            output: { findsTarget },
            steps,
            errors: findsTarget ? [] : ['Target note not found'],
            metrics: { findsTarget: findsTarget ? 1 : 0 },
        };
    },
};

// Task 6: Add missing detail after failed match
export const recoveryTask: TaskConfig<{ noteId: string; missingField: string }, { recoversFromFailure: boolean }> = {
    id: 'task-6-recovery',
    name: 'Add missing detail after failed match',
    type: 'recovery',
    async execute(page, input, seed) {
        await page.goto(`/notes/${input.noteId}`);
        await page.waitForLoadState('networkidle');

        let steps = 0;
        const errors: string[] = [];

        // Click edit
        await page.click('[data-testid="edit-note"]');
        steps++;

        // Add missing field
        await page.click(`[data-testid="add-${input.missingField}"]`);
        steps++;

        await page.fill('[data-testid="property-value"]', 'test value');
        steps++;

        await page.click('[data-testid="save-property"]');
        await page.waitForLoadState('networkidle');
        steps++;

        // Try match again
        await page.click('[data-testid="match-button"]');
        await page.waitForLoadState('networkidle');
        steps++;

        const matches = await page.locator('[data-testid="match-card"]').count();

        return {
            success: matches > 0,
            output: { recoversFromFailure: matches > 0 },
            steps,
            errors: matches === 0 ? ['Still no match after adding detail'] : [],
            metrics: { recoversFromFailure: matches > 0 ? 1 : 0 },
        };
    },
};

export const ALL_TASKS = [
    captureTask,
    matchTask,
    extractionTask,
    commitmentTask,
    searchTask,
    recoveryTask,
];