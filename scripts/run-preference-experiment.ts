#!/usr/bin/env node
/** Preference Experiment Runner (L22) - Strategy comparison */

import { spawnSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '..');

async function run(experimentId = 'match-display-v1') {
    console.log('🧪 Preference Experiment (L22) - Strategy Comparison\n' + '='.repeat(60) + `\nExperiment: ${experimentId}\n`);

    const steps = [
        ['📊 Evaluating...', ['pnpm', 'loop', 'evaluate']],
        ['📊 Comparing variants...', ['pnpm', 'loop', 'compare']],
    ];

    for (const [msg, cmd] of steps) {
        console.log(msg);
        if (spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, stdio: 'inherit' }).status !== 0) {
            console.error(`❌ ${cmd[1]} failed`);
            process.exit(1);
        }
    }

    console.log('\n✅ Complete!');
    console.log('Next: Review loop/runs/latest/, then pnpm loop adopt if winner');
}

run(process.argv[2]).catch(console.error);