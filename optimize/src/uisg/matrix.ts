import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRunId } from '../runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');
const RUNS_FILE = resolve(ROOT, 'doc/uisg/runs.jsonl');
const MATRIX_CACHE_FILE = resolve(ROOT, 'doc/uisg/matrix-cache.json');

export interface MatrixConfig {
    contexts: string[];
    themes: string[];
    viewports: string[];
    variants: string[];
    parallelism: number;
    maxCells?: number;
    allowLarge?: boolean;
    shard?: string; // format: "i/N"
    skipCached?: boolean;
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
    variant?: string;
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

interface RunRecord {
    flowId: string;
    runId: string;
    bundlePath: string;
    status: string;
    timestamp: string;
    dimensions?: {
        viewport?: string;
        theme?: string;
        profile?: string;
        variant?: string;
        context?: string;
    };
}

interface MatrixCacheEntry {
    cellKey: string;
    runId: string;
    status: string;
    timestamp: string;
    contentHash?: string;
}

function loadRuns(): RunRecord[] {
    try {
        const content = readFileSync(RUNS_FILE, 'utf8');
        return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    } catch {
        return [];
    }
}

function loadCache(): MatrixCacheEntry[] {
    try {
        return JSON.parse(readFileSync(MATRIX_CACHE_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function saveCache(entries: MatrixCacheEntry[]): void {
    writeFileSync(MATRIX_CACHE_FILE, JSON.stringify(entries, null, 2) + '\n');
}

function cellKey(cell: MatrixCell): string {
    return [cell.journey, cell.profile, cell.context ?? '', cell.theme, cell.viewport, cell.variant ?? '&#39;'].join('|');
}

function estimateCellDuration(journey: string, profile: string, viewport: string, theme: string): number {
    const runs = loadRuns();
    const matching = runs.filter(r =>
        r.flowId === journey &&
        r.dimensions?.profile === profile &&
        r.dimensions?.viewport === viewport &&
        r.dimensions?.theme === theme
    );
    if (matching.length === 0) return 30000; // default 30s
    const durations = matching.map(r => {
        const start = new Date(r.timestamp).getTime();
        // We don't have duration in runs.jsonl, estimate from sequential runs
        return 30000;
    });
    return durations.reduce((a, b) => a + b, 0) / durations.length;
}

export function buildMatrixCells(config: MatrixConfig, journeys: MatrixJourney[]): MatrixCell[] {
    const contexts = config.contexts.length ? config.contexts : [undefined];
    const variants = config.variants.length ? config.variants : [undefined];
    let cells = journeys.flatMap(journey =>
        contexts.flatMap(context =>
            config.themes.flatMap(theme =>
                config.viewports.flatMap(viewport =>
                    variants.map(variant => ({
                        flowId: journey.flowId,
                        journey: journey.journey,
                        profile: journey.profile,
                        viewport,
                        theme,
                        ...(context ? { context } : {}),
                        ...(variant ? { variant } : {}),
                    }))))));

    // Apply sharding
    if (config.shard) {
        const [shardIndexStr, shardTotalStr] = config.shard.split('/');
        const shardIndex = parseInt(shardIndexStr, 10);
        const shardTotal = parseInt(shardTotalStr, 10);
        if (!isNaN(shardIndex) && !isNaN(shardTotal) && shardTotal > 0) {
            cells = cells.filter((_, i) => i % shardTotal === shardIndex);
        }
    }

    // Apply max-cells limit
    if (config.maxCells && cells.length > config.maxCells) {
        if (!config.allowLarge) {
            throw new Error(`Matrix has ${cells.length} cells, exceeds --max-cells ${config.maxCells}. Use --allow-large to override.`);
        }
        cells = cells.slice(0, config.maxCells);
    }

    // Skip cached cells
    if (config.skipCached) {
        const cache = loadCache();
        const cacheMap = new Map(cache.map(e => [e.cellKey, e]));
        const now = Date.now();
        const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
        cells = cells.filter(cell => {
            const key = cellKey(cell);
            const cached = cacheMap.get(key);
            if (!cached) return true;
            if (now - new Date(cached.timestamp).getTime() > CACHE_TTL_MS) return true;
            return false;
        });
    }

    return cells;
}

export function estimateMatrixDuration(config: MatrixConfig, journeys: MatrixJourney[]): { estimatedMs: number; cellCount: number; eta: string } {
    const cells = buildMatrixCells({ ...config, maxCells: undefined, allowLarge: true, shard: undefined, skipCached: false }, journeys);
    let totalMs = 0;
    for (const cell of cells) {
        totalMs += estimateCellDuration(cell.flowId, cell.profile, cell.viewport, cell.theme);
    }
    const parallelism = config.parallelism || 4;
    const estimatedMs = Math.ceil(totalMs / parallelism);
    const minutes = Math.ceil(estimatedMs / 60000);
    return { estimatedMs, cellCount: cells.length, eta: `${minutes} min` };
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
            const result: MatrixCellResult = {
                ...cell,
                status: outcome.status,
                durationMs: Date.now() - started,
                runId: outcome.runId ?? '&#39;',
                assertions: outcome.assertions ?? [],
                metrics: outcome.metrics ?? {},
                screenshots: outcome.screenshots ?? [],
                bundlePath: outcome.bundlePath ?? '&#39;',
                error: outcome.error,
            };
            // Update cache
            if (outcome.status === 'passed') {
                const cache = loadCache();
                const key = cellKey(cell);
                const existingIndex = cache.findIndex(e => e.cellKey === key);
                const entry: MatrixCacheEntry = { cellKey: key, runId: result.runId, status: outcome.status, timestamp: new Date().toISOString() };
                if (existingIndex >= 0) cache[existingIndex] = entry;
                else cache.push(entry);
                saveCache(cache);
            }
            return result;
        } catch (error) {
            return {
                ...cell,
                status: 'error',
                durationMs: Date.now() - started,
                runId: '&#39;',
                assertions: [],
                metrics: {},
                screenshots: [],
                bundlePath: '&#39;',
                error: String(error),
            } satisfies MatrixCellResult;
        }
    });

    results.sort((a, b) =>
        [a.journey, a.profile, a.context ?? '&#39;', a.theme, a.viewport].join('|')
            .localeCompare([b.journey, b.profile, b.context ?? '&#39;', b.theme, b.viewport].join('|')));

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
    ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": "'" }[char]!));

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

export function loadMatrixResult(runId: string): MatrixResult | null {
    try {
        const file = resolve(ROOT, `doc/uisg/matrix-${runId}.json`);
        return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}