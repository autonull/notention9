/**
 * Prioritize subcommand - prioritizes discovered problems by impact
 */

import { deriveProblemsFromDiscovery, prioritizeProblems } from '@notention/optimize/loop/prioritize';
import { loadDiscoveredArtifact, writeJsonArtifact, getArtifactPaths } from '../artifactIO.js';

interface LoopConfig {
    version: string;
}

export async function runPrioritize(
    config: LoopConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    console.log('📊 Prioritizing discovered problems by impact...\n');

    const paths = getArtifactPaths(outputDir);
    
    // Load discovered artifacts
    const discovered = await loadDiscoveredArtifact(outputDir);
    if (!discovered) {
        console.log('  ❌ No discovered.json found. Run discover first.');
        return 1;
    }
    console.log(`  📄 Loaded discovered artifacts from ${paths.discovered}`);

    // Derive problems from discovery
    const problems = deriveProblemsFromDiscovery(discovered);
    console.log(`  🔍 Derived ${problems.length} problems from discovery`);

    // Prioritize
    const prioritized = prioritizeProblems(problems);
    
    console.log('\n📋 Prioritized Problems:');
    for (const p of prioritized) {
        console.log(`   ${p.rank}. [${p.impactScore}] ${p.type}: ${p.description}`);
        if (!dry) console.log(`      Evidence: ${p.evidence.join('; ')}`);
    }

    // Save prioritized problems
    if (!dry) {
        await writeJsonArtifact(paths.prioritized, prioritized, dry);
        console.log(`\n✅ Prioritized problems written to ${paths.prioritized}`);
    } else {
        console.log('\n🔍 Dry run - no files written');
        if (json) console.log(JSON.stringify(prioritized, null, 2));
    }

    return 0;
}