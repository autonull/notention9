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

export async function runFullLoop(
    config: LoopConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    console.log('🔄 Running full discover→prioritize→synthesize→evaluate→adopt cycle...\n');
    
    // Create a timestamped run directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const runDir = dry ? outputDir : join(outputDir, `run-${timestamp}`);
    
    if (!dry) {
        await ensureDir(runDir);
    }
    
    console.log(`📁 Output directory: ${runDir}\n`);
    
    // Step 1: Discover
    console.log('\n━━━ STEP 1: DISCOVER ━━━');
    const discoverResult = await runDiscover(config, runDir, dry, false);
    if (discoverResult !== 0) {
        console.log('❌ Discover failed, stopping loop');
        return discoverResult;
    }
    
    // Step 2: Prioritize
    console.log('\n━━━ STEP 2: PRIORITIZE ━━━');
    const prioritizeResult = await runPrioritize(config, runDir, dry, false);
    if (prioritizeResult !== 0) {
        console.log('❌ Prioritize failed, stopping loop');
        return prioritizeResult;
    }
    
    // Step 3: Synthesize
    console.log('\n━━━ STEP 3: SYNTHESIZE ━━━');
    const synthesizeResult = await runSynthesize(config, runDir, dry, false);
    if (synthesizeResult !== 0) {
        console.log('❌ Synthesize failed (no candidates passed gates), stopping loop');
        return synthesizeResult;
    }
    
    // Step 4: Evaluate
    console.log('\n━━━ STEP 4: EVALUATE ━━━');
    const evaluateResult = await runEvaluate(config, runDir, dry, false);
    if (evaluateResult !== 0) {
        console.log('❌ Evaluate failed (no candidates beat baseline), stopping loop');
        return evaluateResult;
    }
    
    // Step 5: Adopt
    console.log('\n━━━ STEP 5: ADOPT ━━━');
    const adoptResult = await runAdopt(config, runDir, dry, false);
    if (adoptResult !== 0) {
        console.log('⚠️  Adopt failed (no winning candidate), but continuing');
    }
    
    // Step 6: Request (T4 for failed candidates)
    console.log('\n━━━ STEP 6: REQUEST (T4) ━━━');
    await runRequest(config, runDir, dry, false);
    
    console.log('\n━━━ ✅ FULL LOOP COMPLETE ━━━');
    console.log(`Artifacts written to: ${runDir}`);
    
    return 0;
}