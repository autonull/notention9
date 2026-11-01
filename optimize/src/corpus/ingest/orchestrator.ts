import { readFile, readdir, mkdir } from 'fs/promises';
import { join, extname, relative } from 'path';
import type { CorpusConfig, CorpusAnalysis, ExtractedTerm } from '../ingest.js';
import { extractTerms, extractPhrases, extractContext } from './textProcessor.js';
import { categorizeTerm } from './categorizer.js';
import { generateTestCasesFromCorpus } from './testCaseGenerator.js';
import { generateMatchCasesFromCorpus } from './testCaseGenerator.js';
import { identifyTaxonomyGaps } from './taxonomyGapAnalyzer.js';
import { writeOutputFiles } from './outputWriter.js';

const DEFAULT_CONFIG: CorpusConfig = {
    inputDir: 'corpus',
    outputDir: 'loop/corpus-output',
    fileExtensions: ['.txt', '.md', '.json'],
    minTermLength: 3,
    maxTermsPerFile: 100,
    generateTestCases: true,
    generateMatchCases: true,
};

async function getFiles(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];

    async function walk(currentDir: string): Promise<void> {
        const entries = await readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (extensions.includes(extname(entry.name).toLowerCase())) {
                files.push(fullPath);
            }
        }
    }

    try {
        await walk(dir);
    } catch {
        // Directory might not exist
    }

    return files;
}

export async function ingestCorpus(config: Partial<CorpusConfig> = {}): Promise<CorpusAnalysis> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    console.log(`📂 Ingesting corpus from ${finalConfig.inputDir}...`);

    // Ensure directories exist
    await mkdir(finalConfig.inputDir, { recursive: true });
    await mkdir(finalConfig.outputDir, { recursive: true });

    // Get all files
    const files = await getFiles(finalConfig.inputDir, finalConfig.fileExtensions);
    console.log(`  Found ${files.length} files`);

    // Process each file
    const termMap = new Map<string, ExtractedTerm>();
    const allTerms: string[] = [];

    for (const file of files) {
        const content = await readFile(file, 'utf-8');
        const relativePath = relative(finalConfig.inputDir, file);

        const terms = extractTerms(content, finalConfig.minTermLength);
        const phrases = extractPhrases(content);
        const allExtracted = [...terms, ...phrases].slice(0, finalConfig.maxTermsPerFile);

        for (const term of allExtracted) {
            const existing = termMap.get(term);
            if (existing) {
                existing.frequency++;
                if (!existing.files.includes(relativePath)) {
                    existing.files.push(relativePath);
                }
                const newContexts = extractContext(content, term);
                for (const ctx of newContexts) {
                    if (!existing.contexts.includes(ctx)) {
                        existing.contexts.push(ctx);
                    }
                }
            } else {
                const category = categorizeTerm(term);
                termMap.set(term, {
                    term,
                    frequency: 1,
                    files: [relativePath],
                    contexts: extractContext(content, term),
                    category,
                });
            }
            allTerms.push(term);
        }
    }

    // Sort terms by frequency
    const sortedTerms = Array.from(termMap.values())
        .sort((a, b) => b.frequency - a.frequency);

    // Extract vocabulary (unique terms)
    const vocabulary = [...new Set(allTerms)].sort();

    console.log(`  Extracted ${sortedTerms.length} unique terms from ${files.length} files`);
    console.log(`  Vocabulary size: ${vocabulary.length}`);

    // Generate test cases
    let generatedTestCases: ExtractionTestCase[] = [];
    let generatedMatchCases: MatchTestCase[] = [];

    if (finalConfig.generateTestCases) {
        generatedTestCases = generateTestCasesFromCorpus(sortedTerms, vocabulary);
        console.log(`  Generated ${generatedTestCases.length} extraction test cases`);
    }

    if (finalConfig.generateMatchCases) {
        generatedMatchCases = generateMatchCasesFromCorpus(sortedTerms);
        console.log(`  Generated ${generatedMatchCases.length} match test cases`);
    }

    // Identify taxonomy gaps
    const taxonomyGaps = identifyTaxonomyGaps(sortedTerms);
    console.log(`  Identified ${taxonomyGaps.length} potential taxonomy gaps`);

    const analysis: CorpusAnalysis = {
        totalFiles: files.length,
        totalTerms: sortedTerms.length,
        terms: sortedTerms,
        vocabulary,
        generatedTestCases,
        generatedMatchCases,
        taxonomyGaps,
    };

    // Write output files
    await writeOutputFiles(finalConfig.outputDir, analysis);

    return analysis;
}

// Re-export types for external use
export type { CorpusConfig, CorpusAnalysis, ExtractedTerm } from '../ingest.js';

// Re-export loadCorpusTestCases
export { loadCorpusTestCases } from './loader.ts';