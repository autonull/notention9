/**
 * Adopt subcommand - adopts winning candidate with evidence gate
 */

import { adoptWinner } from '@notention/optimize/synthesis';
import { loadEvaluationReport, loadCandidatesFromDir, writeJsonArtifact, getArtifactPaths } from '../artifactIO.js';

interface LoopConfig {
    version: string;
}

export async function runAdopt(
    config: LoopConfig,
    outputDir: string,
    dry: boolean,
    _json: boolean
): Promise<number> {
    console.log('✅ Adopting winning candidate...\n');

    const paths = getArtifactPaths(outputDir);
    
    // Load evaluation report
    const evaluationReport = await loadEvaluationReport(outputDir);
    if (!evaluationReport) {
        console.log('  ❌ No evaluation-report.json found. Run evaluate first.');
        return 1;
    }
    console.log(`  📄 Loaded evaluation report from ${paths.evaluationReport}`);

    // Load candidates
    const candidatesDir = await loadCandidatesFromDir(paths.candidatesDir);
    
    if (candidatesDir.candidates.size === 0) {
        console.log('  ❌ No candidates found. Run synthesize first.');
        return 1;
    }

    // Adopt winner
    const artifact = await adoptWinner(evaluationReport, candidatesDir, {
        actor: 'cli-user',
        reason: 'Evaluation winner adopted via pnpm loop adopt',
        enabled: false, // Behind feature flag by default
    });

    if (!artifact) {
        console.log('  ❌ No winning candidate to adopt');
        return 1;
    }

    // Save adopted artifact info
    if (!dry) {
        const adoptionInfo = { 
            artifact: { id: artifact.id, kind: artifact.kind, version: artifact.version, interface: artifact.interface },
            adoptedAt: new Date().toISOString() 
        };
        await writeJsonArtifact(paths.adoption, adoptionInfo, dry);
        console.log(`\n✅ Adoption complete. Artifact saved to ${paths.adoption}`);
    } else {
        console.log('\n🔍 Dry run - no files written');
    }

    return 0;
}