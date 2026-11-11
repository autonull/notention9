#!/usr/bin/env node
// scripts/test-ui-batched.ts - Run UI tests in batches to avoid OOM
import {execSync} from 'node:child_process';
import {globSync} from 'glob';
import path from 'path';
import {fileURLToPath} from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST_DIR = path.join(ROOT, 'ui', 'src', 'tests');

// Auto-discover all test files (paths relative to the ui package, where vitest runs)
function discoverTestFiles(): string[] {
    const files = globSync('**/*.test.{ts,tsx}', {cwd: TEST_DIR, absolute: false});
    return files.sort().map(file => path.join('src', 'tests', file));
}

// Group test files by directory for better batching (tests in same dir likely share setup)
function groupByDirectory(files: string[]): string[][] {
    const groups = new Map<string, string[]>();
    
    for (const file of files) {
        const dir = path.dirname(file);
        if (!groups.has(dir)) {
            groups.set(dir, []);
        }
        groups.get(dir)!.push(file);
    }
    
    // Flatten groups into batches of ~10 files each
    const allGroups = Array.from(groups.values());
    const batches: string[][] = [];
    let currentBatch: string[] = [];
    
    for (const group of allGroups) {
        if (currentBatch.length + group.length > 12 && currentBatch.length > 0) {
            batches.push(currentBatch);
            currentBatch = [];
        }
        currentBatch.push(...group);
    }
    
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }
    
    return batches;
}

function run(cmd: string): { passed: boolean; output: string } {
    console.log(`\n🔄 ${cmd}`);
    try {
        const output = execSync(cmd, {
            cwd: ROOT,
            stdio: 'pipe',
            encoding: 'utf-8',
            env: {...process.env, NODE_OPTIONS: '--max-old-space-size=4096'}
        });
        console.log(`✅ Passed`);
        return {passed: true, output};
    } catch (err: any) {
        const output = err.stdout || err.message;
        console.error(`❌ Failed`);
        return {passed: false, output};
    }
}

async function main(): Promise<void> {
    console.log('🚀 Running UI tests in batches to avoid OOM');
    console.log('==========================================');
    
    const testFiles = discoverTestFiles();
    console.log(`📋 Discovered ${testFiles.length} test files`);
    
    const batches = groupByDirectory(testFiles);
    console.log(`📦 Created ${batches.length} batches`);
    
    let allPassed = true;
    
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`\n📦 Batch ${i + 1}/${batches.length} (${batch.length} files)`);
        
        const files = batch.join(' ');
        const result = run(`pnpm --filter @notention/ui exec vitest run ${files}`);
        
        if (!result.passed) {
            allPassed = false;
            console.error(`\n❌ Batch ${i + 1} failed`);
            console.error(result.output);
        }
        
        // Small delay between batches to let memory settle
        await new Promise(r => setTimeout(r, 1000));
    }
    
    if (allPassed) {
        console.log('\n✨ All UI test batches passed!');
    } else {
        console.error('\n❌ Some UI test batches failed');
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});