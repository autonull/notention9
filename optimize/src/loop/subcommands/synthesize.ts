/**
 * Synthesize subcommand - generates candidate strategies (T1-T2)
 */

import { runGatesOnCandidateDir, generateAllCandidates } from '@notention/optimize/synthesis';
import { loadDiscoveredArtifact, loadCandidatesFromDir, writeJsonArtifact, getArtifactPaths } from '../artifactIO.js';

interface LoopConfig {
    version: string;
}

export async function runSynthesize(
    config: LoopConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    console.log('🔧 Synthesizing candidate strategies...\n');

    const paths = getArtifactPaths(outputDir);

    // Load discovered artifacts
    let discovered = await loadDiscoveredArtifact(outputDir);
    
    if (!discovered) {
        console.log('  ⚠️  No discovered.json found, running discovery inline...');
        const { ComponentScanner } = await import('@notention/optimize/discovery');
        const { discoverSeams } = await import('@notention/optimize/discovery');
        const componentScanner = new ComponentScanner();
        const discovery = componentScanner.scan();
        const components = discovery.components;
        const seams = await discoverSeams(components);
        discovered = { components, seams };
    }

    const seams = discovered.seams as any[];
    console.log(`  🔗 Found ${seams.length} seams`);

    // Generate candidates for all seams with built-in specs
    console.log('  🤖 Generating candidate strategies...');
    const candidatesDir = await generateAllCandidates(seams, paths.candidatesDir);
    console.log(`     Generated ${candidatesDir.candidates.size} candidates`);

    // Run static gates on all candidates
    console.log('  🛡️  Running static gates...');
    const gateReports = await runGatesOnCandidateDir(candidatesDir, seams);
    
    let passed = 0;
    let failed = 0;
    for (const report of gateReports) {
        if (report.overallPass) {
            passed++;
            console.log(`     ✅ ${report.candidateId}: ALL GATES PASSED`);
        } else {
            failed++;
            console.log(`     ❌ ${report.candidateId}: FAILED`);
            for (const [gateName, result] of Object.entries(report.gates)) {
                if (!(result as { pass: boolean; errors: string[] }).pass) {
                    console.log(`        - ${gateName}: ${(result as { pass: boolean; errors: string[] }).errors.join(', ')}`);
                }
            }
        }
    }

    // Save gate reports
    await writeJsonArtifact(paths.gateReports, gateReports, dry);
    
    if (!dry) {
        console.log(`\n✅ Gate reports written to ${paths.gateReports}`);
    } else {
        console.log('\n🔍 Dry run - no files written');
        if (json) console.log(JSON.stringify(gateReports, null, 2));
    }

    console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);
    return failed > 0 ? 1 : 0;
}