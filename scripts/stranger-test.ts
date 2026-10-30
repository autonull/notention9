#!/usr/bin/env node
/**
 * Stranger Test (H1) - Run Golden Path with clean profile
 * 
 * Usage: pnpm tsx scripts/stranger-test.ts
 * 
 * This script:
 * 1. Starts the dev server with clean-profile mode
 * 2. Opens browser to the dashboard
 * 3. Records the session (if Playwright available)
 * 4. Measures time to complete Golden Path
 */

import { spawn, spawnSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '..');

async function runStrangerTest() {
    console.log('🧪 Stranger Test (H1) - Golden Path with clean profile');
    console.log('='.repeat(60));
    console.log('');
    console.log('This test verifies: A stranger completes the Golden Path <2 min unaided');
    console.log('');
    console.log('Golden Path: Create request note → Create offer note → See relevant explained match');
    console.log('');
    console.log('Instructions for participant:');
    console.log('  1. Go to the URL shown below');
    console.log('  2. Create a note describing a job you want (e.g., "React developer in Berlin, remote, $50/hr")');
    console.log('  3. Create a note describing a job offer (e.g., "React developer role, $500 budget, remote")');
    console.log('  4. Check the dashboard for a match with explanation');
    console.log('  5. Rate if the match is relevant (Y/N)');
    console.log('');

    // Build UI first
    console.log('📦 Building UI...');
    const buildResult = spawnSync('pnpm', ['--filter', '@notention/ui', 'build'], {
        cwd: ROOT,
        stdio: 'inherit',
    });
    if (buildResult.status !== 0) {
        console.error('❌ Build failed');
        process.exit(1);
    }

    // Start preview server with clean profile
    console.log('🚀 Starting preview server with clean profile...');
    const server = spawn('pnpm', ['--filter', '@notention/ui', 'preview', '--', '--port', '5173'], {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env, VITE_CLEAN_PROFILE: 'true' },
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    const url = 'http://localhost:5173/?clean=true';
    console.log('');
    console.log('✅ Server running!');
    console.log(`🔗 Open this URL in a fresh browser (incognito): ${url}`);
    console.log('');
    console.log('📋 Test checklist:');
    console.log('   [ ] Participant creates request note');
    console.log('   [ ] Participant creates offer note');
    console.log('   [ ] Match appears on dashboard with explanation');
    console.log('   [ ] Time recorded: ___ seconds');
    console.log('   [ ] Match relevance rating: Y / N');
    console.log('');

    // Try to open browser
    try {
        spawnSync('open', [url], { stdio: 'ignore' }); // macOS
    } catch {
        try {
            spawnSync('xdg-open', [url], { stdio: 'ignore' }); // Linux
        } catch {
            console.log('(Could not auto-open browser)');
        }
    }

    console.log('Press Ctrl+C to stop the server when test is complete.');
    console.log('');

    // Keep server running
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping server...');
        server.kill();
        process.exit(0);
    });
}

runStrangerTest().catch(console.error);