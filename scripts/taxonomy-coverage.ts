#!/usr/bin/env node
/**
 * Report scenario taxonomy coverage and reconcile data/loop/taxonomy.json.
 *
 * Usage:
 *   pnpm taxonomy:coverage           # print report
 *   pnpm taxonomy:coverage --write   # also update taxonomy.json coverage block
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
    COARSE_AXES,
    SCENARIO_TAXONOMY,
    TAXONOMY_AXES,
    computeCoverage,
} from '../simulator/src/scenarios/taxonomy.js';

const taxonomyPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'loop', 'taxonomy.json');
const taxonomy = existsSync(taxonomyPath)
    ? JSON.parse(readFileSync(taxonomyPath, 'utf-8'))
    : null;

if (taxonomy) {
    for (const [axis, values] of Object.entries(TAXONOMY_AXES)) {
        const declared = taxonomy.axes?.[axis]?.values;
        if (!declared || declared.join('|') !== values.join('|')) {
            throw new Error(`taxonomy.json axis "${axis}" drifted from simulator annotations`);
        }
    }
} else if (process.argv.includes('--write')) {
    throw new Error(`Cannot write coverage: ${taxonomyPath} does not exist`);
}

const report = computeCoverage();
const percent = ((report.coarseCovered.length / report.coarseTotal) * 100).toFixed(0);

console.log(`Coarse coverage (${COARSE_AXES.join(' × ')}): ${report.coarseCovered.length}/${report.coarseTotal} (${percent}%)`);
console.log(`Scenarios annotated: ${report.scenarioCount}`);
console.log(`Distinct six-axis cells: ${report.fineCellCount}`);
console.log(`\nUncovered coarse cells (${report.coarseUncovered.length}):`);
for (const cell of report.coarseUncovered) console.log(`  - ${cell}`);

if (process.argv.includes('--write') && taxonomy) {
    const note = [
        `Coarse ${COARSE_AXES.join('×')} ${report.coarseCovered.length}/${report.coarseTotal}: `,
        report.coarseCovered.join(', '),
        `. Distinct six-axis cells: ${report.fineCellCount}. `,
        `Uncovered: ${report.coarseUncovered.join(', ')}.`,
    ].join('');

    taxonomy.coverage.cellsCovered = report.coarseCovered.length;
    taxonomy.coverage.note = note;
    taxonomy.audit.date = new Date().toISOString().slice(0, 10);
    writeFileSync(taxonomyPath, `${JSON.stringify(taxonomy, null, 2)}\n`);
    console.log(`\nUpdated ${taxonomyPath}`);
}
