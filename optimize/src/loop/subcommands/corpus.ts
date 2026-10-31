/**
 * Corpus subcommand - ingests corpus files, extracts vocabulary, generates test cases
 */

import { ingestCorpus } from '@notention/optimize/synthesis';
import { getArtifactPaths } from '../artifactIO.js';

interface LoopConfig {
    version: string;
}

export async function runCorpus(
    _config: LoopConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    console.log('📚 Ingesting corpus files...\n');
    
    if (dry) {
        console.log('🔍 Dry run - would ingest corpus files');
        return 0;
    }
    
    try {
        const paths = getArtifactPaths(outputDir);
        const analysis = await ingestCorpus({
            inputDir: 'corpus',
            outputDir: `${paths.outputDir}/corpus-output`,
            generateTestCases: true,
            generateMatchCases: true,
        });
        
        console.log(`\n✅ Corpus ingestion complete`);
        console.log(`   Files processed: ${analysis.totalFiles}`);
        console.log(`   Unique terms: ${analysis.totalTerms}`);
        console.log(`   Vocabulary size: ${analysis.vocabulary.length}`);
        console.log(`   Extraction test cases: ${analysis.generatedTestCases.length}`);
        console.log(`   Match test cases: ${analysis.generatedMatchCases.length}`);
        console.log(`   Taxonomy gaps identified: ${analysis.taxonomyGaps.length}`);
        
        if (analysis.taxonomyGaps.length > 0) {
            console.log('\n📋 Taxonomy Gaps:');
            for (const gap of analysis.taxonomyGaps) {
                console.log(`   - ${gap}`);
            }
        }
        
        if (json) {
            console.log(JSON.stringify(analysis, null, 2));
        }
        
        return 0;
    } catch (error) {
        console.error(`Corpus ingestion failed: ${error instanceof Error ? error.message : String(error)}`);
        return 1;
    }
}