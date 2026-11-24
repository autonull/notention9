import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
    buildMatrixCells, runMatrix, writeMatrixReport, type MatrixCell, type MatrixConfig, type MatrixJourney,
} from './matrix.js';

const config: MatrixConfig = {
    contexts: ['desktop', 'mobile'],
    themes: ['default', 'brand-acme'],
    viewports: ['mobile-390'],
    variants: [],
    parallelism: 2,
};

const journeys: MatrixJourney[] = [
    { flowId: 'flow.a', journey: 'journey.a', profile: 'hand-built' },
];

const dir = mkdtempSync(join(tmpdir(), 'uisg-matrix-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('journey matrix', () => {
    it('builds a deterministic context x theme x viewport grid', () => {
        const cells = buildMatrixCells(config, journeys);
        expect(cells).toHaveLength(4);
        expect(cells.map(({ context, theme }) => `${context}/${theme}`)).toEqual([
            'desktop/default', 'desktop/brand-acme', 'mobile/default', 'mobile/brand-acme',
        ]);
    });

    it('runs cells with bounded parallelism and aggregates outcomes', async () => {
        let active = 0;
        let peak = 0;
        const result = await runMatrix(config, journeys, async (cell: MatrixCell) => {
            active++;
            peak = Math.max(peak, active);
            await new Promise(resolve => setTimeout(resolve, 5));
            active--;
            return { status: cell.theme === 'brand-acme' ? 'failed' : 'passed', runId: `run-${cell.context}` };
        });

        expect(peak).toBeLessThanOrEqual(2);
        expect(peak).toBeGreaterThan(1);
        expect(result.summary).toEqual({ total: 4, passed: 2, failed: 2, skipped: 0, errors: 0 });
        expect(result.cells.map(({ context, theme, status }) => `${context}/${theme}:${status}`)).toEqual([
            'desktop/brand-acme:failed', 'desktop/default:passed',
            'mobile/brand-acme:failed', 'mobile/default:passed',
        ]);
    });

    it('records runner errors as error cells', async () => {
        const result = await runMatrix({ ...config, contexts: [], themes: ['default'], viewports: ['mobile-390'], variants: [], parallelism: 1 }, journeys, () => {
            throw new Error('boom');
        });
        expect(result.summary.errors).toBe(1);
        expect(result.cells[0].error).toBe('Error: boom');
    });

    it('writes JSON and HTML reports', async () => {
        const result = await runMatrix(config, journeys, cell => ({ status: 'passed', runId: `run-${cell.context}` }));
        const { jsonPath, htmlPath } = writeMatrixReport(result, dir);
        const json = JSON.parse(readFileSync(jsonPath, 'utf8'));
        expect(json.summary.total).toBe(4);
        expect(json.cells).toHaveLength(4);
        expect(readFileSync(htmlPath, 'utf8')).toContain('UISG Matrix');
        expect(readFileSync(htmlPath, 'utf8')).toContain('journey.a');
    });
});
