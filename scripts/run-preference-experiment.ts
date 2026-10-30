#!/usr/bin/env node
/**
 * Preference Experiment Runner (L22) - Run strategy comparison experiments
 * 
 * Usage: pnpm tsx scripts/run-preference-experiment.ts [experimentId]
 * 
 * This runs the compare command with real user data from the ProfileRegistry
 */

import { spawnSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '..');

async function runPreferenceExperiment(experimentId?: string) {
    console.log('🧪 Preference Experiment (L22) - Strategy Comparison');
    console.log('='.repeat(60));
    console.log('');
    
    const expId = experimentId || 'match-display-v1';
    console.log(`Experiment: ${expId}`);
    console.log('');

    // First, ensure we have evaluation data
    console.log('📊 Step 1: Running evaluation to generate baseline and candidates...');
    const evalResult = spawnSync('pnpm', ['--filter', '@notention/optimize', 'loop', 'evaluate'], {
        cwd: ROOT,
        stdio: 'inherit',
    });
    
    if (evalResult.status !== 0) {
        console.error('❌ Evaluation failed');
        process.exit(1);
    }

    // Then run compare
    console.log('');
    console.log('📊 Step 2: Comparing strategy variants...');
    const compareResult = spawnSync('pnpm', ['--filter', '@notention/optimize', 'loop', 'compare'], {
        cwd: ROOT,
        stdio: 'inherit',
    });

    if (compareResult.status !== 0) {
        console.error('❌ Compare failed');
        process.exit(1);
    }

    console.log('');
    console.log('✅ Preference experiment complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Review comparison report in loop/runs/latest/');
    console.log('  2. If winner found, run: pnpm loop adopt');
    console.log('  3. For human preference data, run stranger test (H1) and match relevance (H2)');
}

const experimentId = process.argv[2];
runPreferenceExperiment(experimentId).catch(console.error);