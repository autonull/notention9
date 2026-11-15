import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { DOMAIN_SCENARIOS } from './domainScenarios.js';
import { SCENARIO_TAXONOMY, TAXONOMY_AXES, computeCoverage } from './taxonomy.js';

const taxonomyFile = new URL('../../../data/loop/taxonomy.json', import.meta.url);
const taxonomy = existsSync(taxonomyFile)
    ? (JSON.parse(readFileSync(taxonomyFile, 'utf-8')) as {
          axes: Record<string, { values: string[] }>;
          coverage: { cellsCovered: number };
      })
    : null;

describe('scenario taxonomy annotations', () => {
    it('annotates every domain scenario exactly once', () => {
        expect(Object.keys(SCENARIO_TAXONOMY).sort()).toEqual(Object.keys(DOMAIN_SCENARIOS).sort());
    });

    it('uses only declared taxonomy values', () => {
        for (const [scenario, cell] of Object.entries(SCENARIO_TAXONOMY)) {
            for (const [axis, values] of Object.entries(TAXONOMY_AXES)) {
                expect(values, `${scenario} ${axis}`).toContain(cell[axis as keyof typeof cell]);
            }
        }
    });

    it.skipIf(!taxonomy)('matches the taxonomy file axes and reconciled coverage count', () => {
        for (const [axis, values] of Object.entries(TAXONOMY_AXES)) {
            expect(taxonomy!.axes[axis]?.values, axis).toEqual([...values]);
        }
        expect(taxonomy!.coverage.cellsCovered).toBe(computeCoverage().coarseCovered.length);
    });
});
