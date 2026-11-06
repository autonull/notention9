#!/usr/bin/env node
/**
 * Optimizer CLI — Run parameter search cycles
 */

import { Command } from 'commander';
import { runOptimizerCycle, defaultOptimizerConfig, type OptimizerConfig, getCandidateCache } from './index.js';
import { getRunsDir, getCacheDir, getRunDir } from './constants.js';
import { runAuditAndSave, runOntologyAudit } from '../ontology/audit.js';
import { runOntologyPatchTest } from '../ontology/patchTest.js';
// runE2CaptureTest has Playwright dependencies - load dynamically

const program = new Command();

program
    .name('pnpm optimizer')
    .description('Notention Optimizer — Evidence-based parameter search')
    .version('1.0.0');

program
    .command('run')
    .description('Run a single optimizer cycle')
    .option('-s, --seams <seams>', 'Comma-separated seam roles to optimize', 'capture,match')
    .option('-c, --candidates <n>', 'Max candidates per seam', '8')
    .option('--max-runs <n>', 'Max browser runs', '160')
    .option('--max-minutes <n>', 'Max time budget in minutes', '30')
    .option('--no-halving', 'Disable successive halving')
    .option('-o, --output <dir>', 'Output directory', getRunsDir())
    .action(async (options) => {
        const config: OptimizerConfig = {
            ...defaultOptimizerConfig(),
            targetSeams: options.seams.split(',').map((s: string) => s.trim()),
            maxCandidatesPerSeam: parseInt(options.candidates, 10),
            maxBrowserRuns: parseInt(options.maxRuns, 10),
            maxTimeMinutes: parseInt(options.maxMinutes, 10),
            useSuccessiveHalving: options.halving !== false,
        };

        console.log('🔧 Notention Optimizer');
        console.log('=====================');
        console.log(`Target seams: ${config.targetSeams.join(', ')}`);
        console.log(`Max candidates/seam: ${config.maxCandidatesPerSeam}`);
        console.log(`Max browser runs: ${config.maxBrowserRuns}`);
        console.log(`Max time: ${config.maxTimeMinutes} min`);
        console.log(`Successive halving: ${config.useSuccessiveHalving ? 'enabled' : 'disabled'}`);
        console.log('');

        try {
            const result = await runOptimizerCycle(config);

            console.log('\n✅ Optimizer cycle complete');
            console.log(`   Cycle ID: ${result.cycleId}`);
            console.log(`   Candidates evaluated: ${result.candidatesEvaluated}`);
            console.log(`   Winners: ${result.winners.length}`);
            console.log(`   Losers: ${result.losers.length}`);
            console.log(`   Total time: ${(result.totalCost.durationMs / 1000).toFixed(1)}s`);
            console.log(`   Results: ${getRunDir(result.cycleId)}/results.json`);

            if (result.winners.length > 0) {
                console.log('\n🏆 Winners:');
                for (const winner of result.winners) {
                    console.log(`   ${winner.id}: Δ${winner.evaluation?.primaryDelta.toFixed(4)}`);
                    console.log(`     Patch: ${JSON.stringify(winner.patch)}`);
                }
            }

            process.exit(result.winners.length > 0 ? 0 : 1);
        } catch (e) {
            console.error(`\n❌ Optimizer failed: ${e instanceof Error ? e.message : String(e)}`);
            process.exit(1);
        }
    });

program
    .command('config')
    .description('Show default optimizer configuration')
    .action(() => {
        const config = defaultOptimizerConfig();
        console.log(JSON.stringify(config, null, 2));
    });

program
    .command('cache')
    .description('Manage candidate evaluation cache')
    .option('--stats', 'Show cache statistics')
    .option('--clear', 'Clear the cache')
    .action((options) => {
        const cache = getCandidateCache();
        
        if (options.clear) {
            cache.clear();
            console.log('✅ Cache cleared');
            return;
        }
        
        if (options.stats || (!options.clear && !options.stats)) {
            console.log('📦 Candidate Cache Statistics');
            console.log('==============================');
            console.log(`Entries: ${cache.size}`);
            console.log(`Cache dir: ${getCacheDir()}`);
        }
    });

function join(...args: string[]): string {
    return args.join('/');
}

program
    .command('audit')
    .description('Run E7 ontology drift & co-occurrence audit on quality cases')
    .option('-o, --output <file>', 'Output JSON file for results')
    .option('--golden', 'Include loop golden cases in analysis')
    .action(async (options) => {
        if (options.output) {
            await runAuditAndSave(options.output, { includeGolden: options.golden });
        } else {
            await runOntologyAudit({ includeGolden: options.golden });
        }
    });

program
    .command('patch-test')
    .description('Run E14 ontology patch generalization test')
    .option('-o, --output <file>', 'Output JSON file for results')
    .action(async (options) => {
        await runOntologyPatchTest(options.output);
    });

program
    .command('e2-capture')
    .description('Run E2 capture-flow parameter A/B test (10 validation cases × 3 reps)')
    .option('--repetitions <n>', 'Repetitions per case', '3')
    .option('--headless', 'Run browser headless', true)
    .option('-o, --output <file>', 'Output JSON file for results')
    .action(async (options) => {
        const { runE2CaptureTest } = await import('./e2CaptureTest.js');
        await runE2CaptureTest({
            repetitions: parseInt(options.repetitions, 10),
            headless: options.headless !== false,
            output: options.output,
        });
    });

program.parse();