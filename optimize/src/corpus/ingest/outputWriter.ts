import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { CorpusAnalysis } from '../ingest.js';

/**
 * Write corpus analysis output files
 */
export async function writeOutputFiles(outputDir: string, analysis: CorpusAnalysis): Promise<void> {
    await mkdir(outputDir, { recursive: true });

    // Write full analysis
    await writeFile(join(outputDir, 'analysis.json'), JSON.stringify(analysis, null, 2));

    // Write vocabulary
    await writeFile(join(outputDir, 'vocabulary.txt'), analysis.vocabulary.join('\n'));

    // Write terms with metadata
    await writeFile(join(outputDir, 'terms.json'), JSON.stringify(analysis.terms, null, 2));

    // Write test cases for fast evaluator
    if (analysis.generatedTestCases.length > 0) {
        await writeFile(
            join(outputDir, 'extraction-test-cases.json'),
            JSON.stringify(analysis.generatedTestCases, null, 2)
        );
    }

    if (analysis.generatedMatchCases.length > 0) {
        await writeFile(
            join(outputDir, 'match-test-cases.json'),
            JSON.stringify(analysis.generatedMatchCases, null, 2)
        );
    }

    // Write taxonomy gaps report
    await writeFile(join(outputDir, 'taxonomy-gaps.json'), JSON.stringify(analysis.taxonomyGaps, null, 2));

    console.log(`\n✅ Corpus analysis written to ${outputDir}/`);
    console.log(`   - analysis.json (full)`);
    console.log(`   - vocabulary.txt (terms list)`);
    console.log(`   - terms.json (with frequency, contexts, categories)`);
    console.log(`   - extraction-test-cases.json (${analysis.generatedTestCases.length} cases)`);
    console.log(`   - match-test-cases.json (${analysis.generatedMatchCases.length} cases)`);
    console.log(`   - taxonomy-gaps.json (${analysis.taxonomyGaps.length} gaps)`);
}