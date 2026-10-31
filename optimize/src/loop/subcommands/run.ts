/**
 * Run subcommand - runs full discover→prioritize→synthesize→evaluate→adopt cycle
 */

import { join } from 'path';
import { runDiscover } from './discover.js';
import { runPrioritize } from './prioritize.js';
import { runSynthesize } from './synthesize.js';
import { runEvaluate } from './evaluate.js';
import { runAdopt } from './adopt.js';
import { runRequest } from './request.js';
import { getArtifactPaths, ensureDir } from '../artifactIO.js';

interface LoopConfig {
    discovery: {
        sourceDirs?: string[];
        excludePatterns?: string[];
    };
    version: string;
}

interface StepResult {
    name: string;
    success: boolean;
    message?: string;
}

const STEPS: Array<{
    name: string;
    run: (config: LoopConfig, runDir: string, dry: boolean, json: boolean) => Promise<number>;
    stopOnFailure: boolean;
}> = [
    { name: 'DISCOVER', run: runDiscover, stopOnFailure: true },
    { name: 'PRIORITIZE', run: runPrioritize, stopOnFailure: true },
    { name: 'SYNTHESIZE', run: runSynthesize, stopOnFailure: true },
    { name: 'EVALUATE', run: runEvaluate, stopOnFailure: true },
    { name: 'ADOPT', run: runAdopt, stopOnFailure: false },
    { name: 'REQUEST (T4)', run: runRequest, stopOnFailure: false },
];

export async function runFullLoop(
    config: LoopConfig,
    outputDir: string,
    dry: boolean,
    _json: boolean
): Promise<number> {
    console.log('🔄 Running full discover→prioritize→synthesize→evaluate→adopt cycle...\n');

    // Create a timestamped run directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const runDir = dry ? outputDir : join(outputDir, `run-${timestamp}`);

    if (!dry) {
        await ensureDir(runDir);
    }

    console.log(`📁 Output directory: ${runDir}\n`);

    const results: StepResult[] = [];

    for (const step of STEPS) {
        console.log(`\n━━━ STEP: ${step.name} ━━━`);
        const result = await step.run(config, runDir, dry, _json);
        const success = result === 0;
        results.push({ name: step.name, success });

        if (!success) {
            console.log(`❌ ${step.name} failed`);
            if (step.stopOnFailure) {
                console.log('Stopping loop due to failure');
                printSummary(results);
                return result;
            } else {
                console.log(`⚠️  ${step.name} failed, but continuing`);
            }
        } else {
            console.log(`✅ ${step.name} completed`);
        }
    }

    console.log('\n━━━ ✅ FULL LOOP COMPLETE ━━━');
    console.log(`Artifacts written to: ${runDir}`);
    printSummary(results);

    return 0;
}

function printSummary(results: StepResult[]): void {
    console.log('\n📋 Summary:');
    for (const r of results) {
        console.log(`   ${r.success ? '✅' : '❌'} ${r.name}`);
    }
}