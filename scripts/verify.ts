#!/usr/bin/env node
// scripts/verify.ts - One-command full verification (L0 + L1 + L2 + L3)
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
function run(cmd: string, description: string, timeoutMs = 300000): void {
    console.log(`\n🔄 ${description}...`);
    console.log(`   $ ${cmd}`);
    try {
        execSync(cmd, {cwd: rootDir, stdio: 'inherit', encoding: 'utf-8', timeout: timeoutMs});
        console.log(`✅ ${description} passed`);
    } catch (err) {
        console.error(`❌ ${description} failed`);
        process.exit(1);
    }
}

function runOrReport(cmd: string, description: string, timeoutMs = 300000): void {
    console.log(`\n🔄 ${description}...`);
    console.log(`   $ ${cmd}`);
    try {
        execSync(cmd, {cwd: rootDir, stdio: 'inherit', encoding: 'utf-8', timeout: timeoutMs});
        console.log(`✅ ${description} passed`);
    } catch (err) {
        console.warn(`⚠️ ${description} completed with issues (continuing)`);
    }
}
async function main(): Promise<void> {
    console.log('🚀 Starting full verification (pnpm verify)');
    console.log('==========================================');
    console.log('Lanes: L0 (pure) + L1 (fast quality) + L2 (browser smoke) + L3 (golden path)');

    // L0: Fabricated path guard (must pass)
    run('pnpm lint:fabricated', 'L0: Fabricated path grep guard');

    // L0: Purity check - no unexpected native deps
    run('pnpm exec tsx scripts/check-purity.ts', 'L0: Native dependency purity check');

    // L0 + L1: Unit tests (pure + fast quality)
    // Exclude simulator tests (too slow for regular verify; run separately with pnpm --filter @notention/simulator test)
    run('pnpm --filter @notention/core test && pnpm --filter @notention/agent test && pnpm --filter @notention/cli test && pnpm --filter @notention/optimize test', 'L0+L1: Unit tests (core, agent, cli, optimize)');

    // L1 continued: UI unit tests (batched)
    run('pnpm test:ui', 'L1: UI unit tests (batched)');

    // L1: Match quality canary (mean F1 gate)
    run('pnpm eval:match --pass-threshold 0.75', 'L1: Match quality canary (mean F1 >= 0.75)');

    // L1: Param visibility check
    run('pnpm exec tsx scripts/verify-param-visibility.ts', 'L1: Strategy param visibility check');

    // L1: UISG graph gate (validate, analyze, sync, seeded regressions, round-trip, schemas, compile)
    run('pnpm uisg check --compile', 'L1: UISG graph gate');

    // L1: UISG optimize pipeline (types, scan, generate, check)
    run('pnpm uisg optimize', 'L1: UISG optimize pipeline');

    // L2: UISG browser journey - capture-and-edit
    run('pnpm uisg run flow.capture-and-edit', 'L2: UISG E2E journey (capture-and-edit)', 600000);

    // L3: UISG golden path journeys (hand-built, not skeleton drafts)
    run('pnpm uisg run flow.golden-path', 'L3: UISG journey (golden-path)', 600000);
    run('pnpm uisg run flow.publish-gate', 'L3: UISG journey (publish-gate)', 600000);
    run('pnpm uisg run flow.ontology-conflict', 'L3: UISG journey (ontology-conflict)', 600000);
    run('pnpm uisg run flow.capture-and-edit-palette', 'L3: UISG journey (capture-and-edit-palette)', 600000);
    run('pnpm uisg run flow.capture-and-edit-keyboard', 'L3: UISG journey (capture-and-edit-keyboard)', 600000);

    // L3: UISG journey matrix + decision gate (affected cells only, skip playwright)
    // Matrix reports results but doesn't fail verification - decide gate handles promotion
    runOrReport('pnpm uisg matrix --contexts=all --themes=default --viewports=all --variants=all --no-build --affected --no-playwright --max-cells 20 --allow-large', 'L3: UISG journey matrix (affected, max 20 cells)', 900000);
    // Find latest matrix file and run decide
    run('pnpm exec tsx -e \'import {readdirSync} from "fs"; import {resolve} from "path"; const files = readdirSync(resolve("doc/uisg")).filter(f => f.startsWith("matrix-") && f.endsWith(".json")).sort().reverse(); if (files[0]) console.log(`pnpm uisg decide --matrix=doc/uisg/${files[0]}`); else console.log("no matrix file");\'', 'Find latest matrix file');
    run('pnpm exec tsx -e \'import {readdirSync} from "fs"; import {resolve} from "path"; const files = readdirSync(resolve("doc/uisg")).filter(f => f.startsWith("matrix-") && f.endsWith(".json")).sort().reverse(); if (files[0]) { const {execSync} = require("child_process"); execSync(`pnpm uisg decide --matrix=doc/uisg/${files[0]}`, {stdio: "inherit"}); }\'', 'L3: UISG decision gate');

    // Performance budget
    run('pnpm optimize perf:budget', 'L3: Performance budget check');

    console.log('\n✨ All verification steps passed!');
    console.log('==========================================');
}
main().catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
});