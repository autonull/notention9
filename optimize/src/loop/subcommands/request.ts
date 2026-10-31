/**
 * Request subcommand - emits T4 request from evaluation evidence
 */

import { join } from 'path';
import { generateT4FromFailedCandidates } from '@notention/optimize/synthesis';
import { loadEvaluationReport, getArtifactPaths } from '../artifactIO.js';

interface LoopConfig {
    version: string;
}

export async function runRequest(
    config: LoopConfig,
    outputDir: string,
    dry: boolean,
    _json: boolean
): Promise<number> {
    console.log('📝 Emitting T4 request from evaluation evidence...\n');

    const paths = getArtifactPaths(outputDir);
    
    // Load evaluation report
    const evaluationReport = await loadEvaluationReport(outputDir);
    if (!evaluationReport) {
        console.log('  ❌ No evaluation-report.json found. Run evaluate first.');
        return 1;
    }
    console.log(`  📄 Loaded evaluation report from ${paths.evaluationReport}`);

    // Generate T4 requests from failed candidates
    const requests = generateT4FromFailedCandidates(evaluationReport, join(outputDir, 'requests'));
    
    if (requests.length === 0) {
        console.log('  ✅ No T4 requests needed - all candidates passed or no failures');
        return 0;
    }

    console.log(`\n📋 Generated ${requests.length} T4 request(s):`);
    for (const req of requests) {
        console.log(`   - ${req.id}: ${req.title}`);
        console.log(`     Priority: ${req.priority}, Status: ${req.status}`);
    }

    if (dry) {
        console.log('\n🔍 Dry run - no files written');
    } else {
        console.log(`\n✅ T4 requests written to ${outputDir}/requests/`);
    }

    return 0;
}