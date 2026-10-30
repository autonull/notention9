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
                const result = await task.execute(page, input, this.config.seed + rep, this.config.baseURL);
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
    async execute(page, input, seed, baseURL) {
        await page.goto(`${baseURL}/#dashboard`);
        await page.waitForLoadState('networkidle');

        const startTime = Date.now();
        let steps = 0;
        const errors: string[] = [];

        // Type the input in the quick capture input (uses Input component with leftIcon)
        const editor = page.locator('input[placeholder*="What\'s on your mind"]').first();
        await editor.fill(input);
        steps++;

        // Submit
        await page.click('button[aria-label="Create note"]');
        steps++;

        // Wait for extraction to complete
        await page.waitForTimeout(1000);
        steps++;

        // Count extracted properties (badges shown after extraction)
        const properties = await page.locator('[data-testid="extracted-property"], .badge:has-text(":")').count();
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
    async execute(page, input, seed, baseURL) {
        await page.goto(`${baseURL}/#dashboard`);
        await page.waitForLoadState('networkidle');

        let steps = 0;
        const errors: string[] = [];

        // Enter offer in quick capture
        const editor = page.locator('input[placeholder*="What\'s on your mind"]').first();
        await editor.fill(input.offer);
        steps++;

        // Submit
        await page.click('button[aria-label="Create note"]');
        await page.waitForLoadState('networkidle');
        steps++;

        // Wait for match to appear (LocalMatchPreview)
        await page.waitForTimeout(2000);
        const matches = await page.locator('[data-testid="match-card"], [data-testid="local-match-preview"], .match-preview').count();
        steps++;

        // Check if re-edited
        const reedited = await page.locator('[data-testid="edit-button"], button:has-text("Edit")').isVisible().catch(() => false);

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
    async execute(page, input, seed, baseURL) {
        await page.goto(`${baseURL}/#dashboard`);
        await page.waitForLoadState('networkidle');

        let steps = 0;
        const errors: string[] = [];

        const editor = page.locator('input[placeholder*="What\'s on your mind"]').first();
        await editor.fill(input);
        steps++;

        // Submit (the extraction happens automatically in the app)
        await page.click('button[aria-label="Create note"]');
        await page.waitForLoadState('networkidle');
        steps++;

        // Wait for note to be created and navigate to it
        await page.waitForTimeout(1000);
        // Check if we navigated to notes view with the new note
        const noteTitle = await page.locator('h1, [data-testid="note-title"]').first().textContent().catch(() => '');
        steps++;

        // Check for extracted properties in the sidebar/badges
        const fields = await page.locator('[data-testid="extracted-property"], .badge:has-text(":")').count();

        return {
            success: fields >= 3,
            output: { valid: fields >= 3, fields },
            steps,
            errors: fields < 3 ? ['Less than 3 fields extracted'] : [],
            metrics: { valid: fields >= 3 ? 1 : 0, fields },
        };
    },
};

// Task 4: Open note → commitment with status+deadline
export const commitmentTask: TaskConfig<{ noteId: string }, { hasStatus: boolean; hasDeadline: boolean }> = {
    id: 'task-4-commitment',
    name: 'Open note → commitment with status+deadline',
    type: 'commitment',
    async execute(page, input, seed, baseURL) {
        // First create a test note via quick capture
        await page.goto(`${baseURL}/#dashboard`);
        await page.waitForLoadState('networkidle');

        const editor = page.locator('input[placeholder*="What\'s on your mind"]').first();
        await editor.fill('Test note for commitment');
        await page.click('button[aria-label="Create note"]');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        let steps = 0;
        const errors: string[] = [];

        // Open the property inspector/sidebar
        await page.click('button[aria-label*="Inspector"], button:has-text("Properties")').catch(() => {});
        steps++;

        // Try to add a status property
        await page.click('[data-testid="add-property-status"], button:has-text("status")').catch(() => {});
        steps++;

        // Fill deadline
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        await page.locator('input[placeholder*="deadline"], input[type="date"]').first().fill(tomorrow).catch(() => {});
        steps++;

        // Save
        await page.locator('button:has-text("Save"), button[type="submit"]').first().click().catch(() => {});
        await page.waitForTimeout(500);
        steps++;

        // Check if status and deadline appear
        const hasStatus = await page.locator('text=/status.*open/i').isVisible().catch(() => false);
        const hasDeadline = await page.locator(`text=${tomorrow}`).isVisible().catch(() => false);

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
    async execute(page, input, seed, baseURL) {
        // First create a test note via quick capture
        await page.goto(`${baseURL}/#dashboard`);
        await page.waitForLoadState('networkidle');

        const editor = page.locator('input[placeholder*="What\'s on your mind"]').first();
        await editor.fill(input.intent);
        await page.click('button[aria-label="Create note"]');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Go back to dashboard and use command palette to search
        await page.goto(`${baseURL}/#dashboard`);
        await page.waitForLoadState('networkidle');

        let steps = 0;
        const errors: string[] = [];

        // Open command palette (Cmd+K)
        await page.keyboard.press('Meta+K');
        steps++;

        // Type search query
        await page.locator('input[placeholder*="command"], input[placeholder*="search"]').first().fill(input.intent);
        steps++;

        // Wait for results
        await page.waitForTimeout(1000);

        // Check if target note appears in results
        const findsTarget = await page.locator(`text=${input.intent}`).first().isVisible().catch(() => false);

        // Close palette
        await page.keyboard.press('Escape');

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
    async execute(page, input, seed, baseURL) {
        // First create a test note via quick capture
        await page.goto(`${baseURL}/#dashboard`);
        await page.waitForLoadState('networkidle');

        const editor = page.locator('input[placeholder*="What\'s on your mind"]').first();
        await editor.fill('Test note for recovery');
        await page.click('button[aria-label="Create note"]');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Open the note in editor (notes view)
        await page.goto(`${baseURL}/#notes`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        let steps = 0;
        const errors: string[] = [];

        // Open property inspector
        await page.locator('button[aria-label*="Inspector"], button:has-text("Properties")').first().click().catch(() => {});
        steps++;

        // Add missing field
        await page.locator('[data-testid="add-property"], button:has-text("Add property")').first().click().catch(() => {});
        steps++;

        await page.locator('input[placeholder*="value"], input[type="text"]').first().fill('test value').catch(() => {});
        steps++;

        // Save
        await page.locator('button:has-text("Save"), button[type="submit"]').first().click().catch(() => {});
        await page.waitForTimeout(500);
        steps++;

        // Try match again - go to dashboard and check for matches
        await page.goto(`${baseURL}/#dashboard`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const matches = await page.locator('[data-testid="local-match-preview"], .match-preview').count();

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