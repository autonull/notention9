import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRunId } from '../runner.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export interface MatrixConfig {
    contexts: string[];
    themes: string[];
    viewports: string[];
    parallelism: number;
}

export interface MatrixJourney {
    flowId: string;
    journey: string;
    profile: string;
}

export interface MatrixCell {
    flowId: string;
    journey: string;
    profile: string;
    viewport: string;
    theme: string;
    context?: string;
}

export type MatrixCellStatus = 'passed' | 'failed' | 'skipped' | 'error';

export interface MatrixRunnerOutcome {
    status: MatrixCellStatus;
    runId?: string;
    assertions?: unknown[];
    metrics?: Record<string, number>;
    screenshots?: string[];
    bundlePath?: string;
    error?: string;
}

export type MatrixCellRunner = (cell: MatrixCell) => Promise<MatrixRunnerOutcome> | MatrixRunnerOutcome;

export interface MatrixCellResult extends MatrixCell {
    status: MatrixCellStatus;
    durationMs: number;
    runId: string;
    assertions: unknown[];
    metrics: Record<string, number>;
    screenshots: string[];
    bundlePath: string;
    error?: string;
}

export interface MatrixResult {
    runId: string;
    startedAt: string;
    completedAt: string;
    config: MatrixConfig;
    cells: MatrixCellResult[];
    summary: { total: number; passed: number; failed: number; skipped: number; errors: number };
}

export function buildMatrixCells(config: MatrixConfig, journeys: MatrixJourney[]): MatrixCell[] {
    const contexts = config.contexts.length ? config.contexts : [undefined];
    return journeys.flatMap(journey =>
        contexts.flatMap(context =>
            config.themes.flatMap(theme =>
                config.viewports.map(viewport => ({
                    flowId: journey.flowId,
                    journey: journey.journey,
                    profile: journey.profile,
                    viewport,
                    theme,
                    ...(context ? { context } : {}),
                })))));
}

async function runWithConcurrency<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await run(items[index]);
        }
    });
    await Promise.all(workers);
    return results;
}

export async function runMatrix(
    config: MatrixConfig,
    journeys: MatrixJourney[],
    run: MatrixCellRunner,
): Promise<MatrixResult> {
    const startedAt = new Date().toISOString();
    const cells = buildMatrixCells(config, journeys);
    const results = await runWithConcurrency(cells, config.parallelism, async cell => {
        const started = Date.now();
        try {
            const outcome = await run(cell);
            return {
                ...cell,
                status: outcome.status,
                durationMs: Date.now() - started,
                runId: outcome.runId ?? '',
                assertions: outcome.assertions ?? [],
                metrics: outcome.metrics ?? {},
                screenshots: outcome.screenshots ?? [],
                bundlePath: outcome.bundlePath ?? '',
                error: outcome.error,
            } satisfies MatrixCellResult;
        } catch (error) {
            return {
                ...cell,
                status: 'error',
                durationMs: Date.now() - started,
                runId: '',
                assertions: [],
                metrics: {},
                screenshots: [],
                bundlePath: '',
                error: String(error),
            } satisfies MatrixCellResult;
        }
    });

    results.sort((a, b) =>
        [a.journey, a.profile, a.context ?? '', a.theme, a.viewport].join('|')
            .localeCompare([b.journey, b.profile, b.context ?? '', b.theme, b.viewport].join('|')));

    const summary = {
        total: results.length,
        passed: results.filter(cell => cell.status === 'passed').length,
        failed: results.filter(cell => cell.status === 'failed').length,
        skipped: results.filter(cell => cell.status === 'skipped').length,
        errors: results.filter(cell => cell.status === 'error').length,
    };

    return {
        runId: createRunId('matrix'),
        startedAt,
        completedAt: new Date().toISOString(),
        config,
        cells: results,
        summary,
    };
}

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

function renderHtml(result: MatrixResult): string {
    const rows = result.cells.map(cell => `<tr>
        <td>${escapeHtml(cell.journey)}</td>
        <td>${escapeHtml(cell.profile)}</td>
        <td>${escapeHtml(cell.context ?? '')}</td>
        <td>${escapeHtml(cell.theme)}</td>
        <td>${escapeHtml(cell.viewport)}</td>
        <td class="${cell.status}">${cell.status}</td>
        <td>${cell.durationMs}</td>
    </tr>`).join('\n');
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>UISG Matrix ${escapeHtml(result.runId)}</title>
<style>
body{font-family:ui-sans-serif,system-ui,sans-serif;margin:2rem;color:#1b1d21}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #d8d8d2;padding:.4rem .6rem;text-align:left;font-size:.85rem}
th{background:#f1f1ee}
.passed{color:#2f8a63}.failed{color:#b3414f}.error{color:#b3414f}.skipped{color:#5a5f69}
</style>
</head>
<body>
<h1>UISG Matrix ${escapeHtml(result.runId)}</h1>
<p>${result.summary.passed}/${result.summary.total} passed · ${result.summary.failed} failed · ${result.summary.skipped} skipped · ${result.summary.errors} errors</p>
<table>
<thead><tr><th>Journey</th><th>Profile</th><th>Context</th><th>Theme</th><th>Viewport</th><th>Status</th><th>ms</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>
`;
}

export function writeMatrixReport(result: MatrixResult, outputDir = 'doc/uisg'): { jsonPath: string; htmlPath: string } {
    const dir = resolve(ROOT, outputDir);
    mkdirSync(dir, { recursive: true });
    const jsonPath = resolve(dir, `matrix-${result.runId}.json`);
    const htmlPath = resolve(dir, `matrix-${result.runId}.html`);
    writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n');
    writeFileSync(htmlPath, renderHtml(result));
    return { jsonPath, htmlPath };
}
