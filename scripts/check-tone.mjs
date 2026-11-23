#!/usr/bin/env node
// Guard the tone tail: literal accent classes may shrink, never grow.
// Baseline: scripts/tone-baseline.json. Refresh only after a deliberate change.
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {join, relative, resolve} from 'node:path';

const ROOT = resolve(process.cwd(), 'ui/src');
const BASELINE = resolve(process.cwd(), 'scripts/tone-baseline.json');
const LITERAL = /\b(?:bg|text|border|ring|fill|stroke|divide|from|via|to|shadow|outline|placeholder|accent|caret)-(?:blue|purple|neutral)-\d{2,3}\b|\btext-white\b/g;
const SKIP = /\/styles\/|\.test\./;

const walk = async directory => {
    const entries = await readdir(directory, {withFileTypes: true}).catch(() => []);
    const files = await Promise.all(entries.map(entry => {
        const full = join(directory, entry.name);
        return entry.isDirectory() ? walk(full) : Promise.resolve([full]);
    }));
    return files.flat();
};

const scan = async () => {
    const files = (await walk(ROOT)).filter(file => /\.(ts|tsx)$/.test(file) && !SKIP.test(file));
    const counts = {};
    const samples = {};
    for (const file of files) {
        const lines = (await readFile(file, 'utf8')).split('\n');
        let total = 0;
        const hits = [];
        lines.forEach((line, index) => {
            const matches = line.match(LITERAL) ?? [];
            if (matches.length === 0) return;
            total += matches.length;
            if (hits.length < 2) hits.push(`${index + 1}: ${line.trim().slice(0, 120)}`);
        });
        if (total === 0) continue;
        const name = relative(process.cwd(), file);
        counts[name] = total;
        samples[name] = hits;
    }
    return {counts, samples};
};

const main = async () => {
    const {counts, samples} = await scan();
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    if (process.argv.includes('--update')) {
        const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
        await writeFile(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
        console.log(`Tone baseline updated: ${total} literals in ${Object.keys(sorted).length} files.`);
        return;
    }

    const baseline = JSON.parse(await readFile(BASELINE, 'utf8').catch(() => '{}'));
    const baselineTotal = Object.values(baseline).reduce((sum, count) => sum + count, 0);
    const regressions = Object.entries(counts)
        .filter(([file, count]) => count > (baseline[file] ?? 0))
        .map(([file, count]) => ({file, count, allowed: baseline[file] ?? 0, samples: samples[file]}));
    const lower = Object.entries(baseline)
        .filter(([file, count]) => (counts[file] ?? 0) < count)
        .map(([file, count]) => `${file} (${count} -> ${counts[file] ?? 0})`);

    console.log(`Tone literals: ${total} in ${Object.keys(counts).length} files (baseline ${baselineTotal}).`);
    if (lower.length > 0) {
        console.warn('Tone note: baseline can shrink for touched files:');
        for (const entry of lower.slice(0, 8)) console.warn(`  ${entry}`);
        if (lower.length > 8) console.warn(`  ... ${lower.length - 8} more`);
    }
    if (regressions.length === 0) return;

    console.error('Tone violation: new literal accent classes. Use app tokens.');
    for (const {file, count, allowed, samples} of regressions) {
        console.error(`  ${file}: ${count} (allowed ${allowed})`);
        for (const sample of samples) console.error(`    ${sample}`);
    }
    console.error('Run `pnpm lint:tone --update` only to record a deliberate baseline change.');
    process.exit(1);
};

main().catch(error => {
    console.error('Tone check failed:', error);
    process.exit(1);
});
