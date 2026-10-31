/**
 * Corpus subcommand - ingests corpus files, extracts vocabulary, generates test cases
 */

import { BaseSubcommand, SubcommandConfig, SubcommandOptions } from './base.js';
import { ingestCorpus } from '../../synthesis/index.js';

export class CorpusSubcommand extends BaseSubcommand {
    constructor(config: SubcommandConfig, options: SubcommandOptions) {
        super(config, options);
    }

    protected getName(): string {
        return 'Corpus';
    }

    protected async execute(): Promise<number> {
        this.logStep('CORPUS');
        this.logInfo('Ingesting corpus files...\n');

        if (this.options.dry) {
            this.logInfo('Dry run - would ingest corpus files');
            return 0;
        }

        try {
            const analysis = await ingestCorpus({
                inputDir: 'corpus',
                outputDir: `${this.paths.outputDir}/corpus-output`,
                generateTestCases: true,
                generateMatchCases: true,
            });

            this.logSuccess('Corpus ingestion complete');
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

            if (this.options.json) {
                console.log(JSON.stringify(analysis, null, 2));
            }

            return 0;
        } catch (error) {
            this.logError(`Corpus ingestion failed: ${error instanceof Error ? error.message : String(error)}`);
            return 1;
        }
    }
}

export async function runCorpus(
    config: SubcommandConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    const subcommand = new CorpusSubcommand(config, { outputDir, dry, json });
    return subcommand.run();
}