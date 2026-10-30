#!/usr/bin/env node
/** Stranger Test (H1) - Golden Path with clean profile */

import { spawn, spawnSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const URL = 'http://localhost:5173/?clean=true';

async function runStrangerTest() {
    console.log('🧪 Stranger Test (H1) - Golden Path with clean profile');
    console.log('='.repeat(60));
    console.log('\nVerifies: Stranger completes Golden Path <2 min unaided');
    console.log('Golden Path: Create request note → Create offer note → See relevant explained match\n');

    console.log('📦 Building UI...');
    if (spawnSync('pnpm', ['--filter', '@notention/ui', 'build'], { cwd: ROOT, stdio: 'inherit' }).status !== 0) {
        console.error('❌ Build failed');
        process.exit(1);
    }

    console.log('🚀 Starting preview server...');
    const server = spawn('pnpm', ['--filter', '@notention/ui', 'preview', '--', '--port', '5173'], {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env, VITE_CLEAN_PROFILE: 'true' },
    });

    await new Promise(r => setTimeout(r, 3000));

    console.log('\n✅ Server running!');
    console.log(`🔗 Open in fresh browser (incognito): ${URL}\n`);

    console.log('📋 Checklist:');
    console.log('   [ ] Create request note (e.g., "React developer in Berlin, remote, $50/hr")');
    console.log('   [ ] Create offer note (e.g., "React developer role, $500 budget, remote")');
    console.log('   [ ] Match appears on dashboard with explanation');
    console.log('   [ ] Time recorded: ___ seconds');
    console.log('   [ ] Match relevance: Y / N\n');

    for (const cmd of ['open', 'xdg-open']) {
        try {
            spawnSync(cmd, [URL], { stdio: 'ignore' });
            break;
        } catch {}
    }

    console.log('Press Ctrl+C to stop when complete.\n');

    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping server...');
        server.kill();
        process.exit(0);
    });
}

runStrangerTest().catch(console.error);