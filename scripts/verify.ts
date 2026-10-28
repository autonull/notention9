#!/usr/bin/env node
// scripts/verify.ts - One-command full verification
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function run(cmd: string, description: string): void {
    console.log(`\n🔄 ${description}...`);
    console.log(`   $ ${cmd}`);
    try {
        execSync(cmd, {cwd: rootDir, stdio: 'inherit', encoding: 'utf-8'});
        console.log(`✅ ${description} passed`);
    } catch (err) {
        console.error(`❌ ${description} failed`);
        process.exit(1);
    }
}

async function main(): Promise<void> {
    console.log('🚀 Starting full verification (pnpm verify)');
    console.log('==========================================');

    // 1. Build all packages (includes typechecking)
    run('pnpm build', 'Build all packages');

    // 2. Run unit tests with memory guard
    run('pnpm --filter @notention/core test', 'Core unit tests');
    run('pnpm --filter @notention/agent test', 'Agent unit tests');
    run('pnpm --filter @notention/cli test', 'CLI unit tests');
    run('tsx scripts/test-ui-batched.ts', 'UI unit tests (batched)');

    // 3. Run optimize E2E journeys (smoke test)
    run('pnpm optimize optimize capture-and-edit', 'Optimize E2E: capture-and-edit');

    console.log('\n✨ All verification steps passed!');
    console.log('==========================================');
}

main().catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
});