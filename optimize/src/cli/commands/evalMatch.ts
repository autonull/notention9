/**
 * Match Quality Evaluation CLI Command
 * Runs the 22 quality match cases against the QUALITY_CASE_NOTES corpus
 * and reports precision/recall/F1 with a pass threshold.
 */

import { Command, registerCommand } from '../Command.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { MatchEngine } from '@notention/core/matching';
import { createNote, ExtractionPipeline, type Note, type Property, type OntologyNode } from '@notention/core';
import { getOntology } from '@notention/core/ontology';
import { QUALITY_CASE_NOTES } from '@notention/core/fixtures';

interface MatchCase {
    id: string;
    input: string;
    expected: Array<{ noteId: string; minScore: number }>;
    tags: string[];
}

interface MatchCaseResult {
    caseId: string;
    input: string;
    expected: Array<{ noteId: string; minScore: number }>;
    actual: Array<{ noteId: string; score: number }>;
    tp: number;
    fp: number;
    fn: number;
    precision: number;
    recall: number;
    f1: number;
    passed: boolean;
    details: string[];
}

interface MatchEvalResult {
    timestamp: string;
    minScoreThreshold: number;
    totalCases: number;
    passedCases: number;
    failedCases: number;
    avgPrecision: number;
    avgRecall: number;
    avgF1: number;
    caseResults: MatchCaseResult[];
}

const DEFAULT_MIN_SCORE = 0.3;
const PASS_THRESHOLD_F1 = 0.5; // Minimum mean F1 to pass

export class EvalMatchCommand extends Command {
    readonly name = 'eval:match';
    readonly description = 'Run quality match evaluation (22 cases) against QUALITY_CASE_NOTES corpus; reports precision/recall/F1';
    readonly options = [
        { name: 'threshold', type: 'number' as const, short: 't', description: `Minimum match score threshold (default: ${DEFAULT_MIN_SCORE})` },
        { name: 'output', type: 'string' as const, short: 'o', description: 'Output directory (default: data/eval/match)' },
        { name: 'json', type: 'boolean' as const, description: 'Output JSON to stdout' },
        { name: 'pass-threshold', type: 'number' as const, description: `Pass threshold for mean F1 (default: ${PASS_THRESHOLD_F1})` },
    ];

    async execute(args: {
        threshold?: number;
        output?: string;
        json?: boolean;
        passThreshold?: number;
        positionals: string[];
    }): Promise<number> {
        try {
            const minScore = args.threshold ?? DEFAULT_MIN_SCORE;
            const passThreshold = args.passThreshold ?? PASS_THRESHOLD_F1;
            const outputDir = args.output ?? join(process.cwd(), 'data', 'eval', 'match');

            this.printInfo(`Running quality match evaluation (minScore: ${minScore})...`);

            // Load manifest
            // Find project root (contains pnpm-workspace.yaml)
            let projectRoot = process.cwd();
            while (projectRoot !== '/') {
                try {
                    await import.meta.resolve(`${projectRoot}/pnpm-workspace.yaml`);
                    break;
                } catch {
                    projectRoot = join(projectRoot, '..');
                }
            }
            
            const manifestPath = join(projectRoot, 'data', 'eval', 'cases', 'manifest.json');
            const manifestContent = await readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);

            const matchCases = manifest.cases.filter((c: any) => c.qualityFamily === 'match');
            this.printInfo(`Found ${matchCases.length} match cases`);

            const ontology = getOntology().nodes;
            const ontologyArray = Array.from(ontology.values());
            const engine = new MatchEngine(ontologyArray);

            // Build candidate notes map from QUALITY_CASE_NOTES
            const candidateNotesByPrefix = new Map<string, Note[]>();
            for (const note of QUALITY_CASE_NOTES) {
                const prefix = note.id.split('-')[1]; // e.g., "ramp" from "note-ramp-001"
                if (!candidateNotesByPrefix.has(prefix)) {
                    candidateNotesByPrefix.set(prefix, []);
                }
                candidateNotesByPrefix.get(prefix)!.push(note);
            }

            // Map case numbers to prefixes
            const prefixMap: Record<string, string> = {
                '001': 'ramp',
                '002': 'dog',
                '003': 'piano',
                '004': 'ride',
                '005': 'move',
                '006': 'meal',
                '007': 'donate',
                '008': 'spanish',
                '009': 'sitter',
                '010': 'mentor',
                '011': 'photo',
                '012': 'drive',
                '013': 'tech',
                '014': 'mentor',
                '015': 'photo',
                '016': 'drive',
                '017': 'tech',
                '018': 'donate',
                '019': 'clean',
                '020': 'resume',
                '021': 'grocery',
                '022': 'legal',
            };

            const caseResults: MatchCaseResult[] = [];
            let passedCases = 0;

            for (const caseRef of matchCases) {
                const casePath = join(projectRoot, 'data', 'eval', 'cases', caseRef.path);
                const caseContent = await readFile(casePath, 'utf-8');
                const caseData = JSON.parse(caseContent) as MatchCase;

                const caseNum = caseData.id.split('-')[2];
                const prefix = prefixMap[caseNum];
                const candidateNotes = prefix ? candidateNotesByPrefix.get(prefix) || [] : [];

                if (candidateNotes.length === 0) {
                    this.printWarning(`No candidate notes for case ${caseData.id} (prefix: ${prefix})`);
                }

                // Create request note from input using full extraction pipeline (without AI)
                const pipeline = new ExtractionPipeline();
                const extractionResult = await pipeline.extract(caseData.input, ontologyArray, {
                    intents: true,
                    patterns: true,
                    ontologyKeys: true,
                    fuzzy: true,
                    price: true,
                    dates: true,
                    roles: true,
                });
                const requestNote = createNote({
                    id: `request-${caseData.id}`,
                    properties: extractionResult.properties,
                });

                // Match against candidate notes
                const matchResults = candidateNotes.map(offerNote => {
                    const result = engine.calculateMatchScore(requestNote, offerNote);
                    return { note: offerNote, score: result.score };
                });

                // Filter by minScore
                const actual = matchResults
                    .filter(m => m.score >= minScore)
                    .map(m => ({ noteId: m.note.id, score: m.score }));

                // Expected note IDs that meet the threshold
                const expectedIds = caseData.expected
                    .filter(e => e.minScore >= minScore)
                    .map(e => e.noteId);

                const expectedSet = new Set(expectedIds);
                const actualSet = new Set(actual.map(a => a.noteId));

                let tp = 0;
                let fp = 0;
                let fn = 0;
                const details: string[] = [];

                for (const exp of caseData.expected) {
                    if (exp.minScore < minScore) continue; // Below threshold, don't count
                    const actualMatch = actual.find(a => a.noteId === exp.noteId);
                    if (actualMatch && actualMatch.score >= exp.minScore) {
                        tp++;
                        details.push(`✓ ${exp.noteId} score ${actualMatch.score.toFixed(2)} >= ${exp.minScore}`);
                    } else if (actualMatch) {
                        fn++;
                        details.push(`✗ ${exp.noteId} score ${actualMatch.score.toFixed(2)} < ${exp.minScore}`);
                    } else {
                        fn++;
                        details.push(`✗ MISSING ${exp.noteId}`);
                    }
                }

                for (const act of actual) {
                    if (!expectedSet.has(act.noteId)) {
                        fp++;
                        details.push(`⚠ EXTRA ${act.noteId} score ${act.score.toFixed(2)}`);
                    }
                }

                const precision = (tp + fp) > 0 ? tp / (tp + fp) : 1;
                const recall = (tp + fn) > 0 ? tp / (tp + fn) : 1;
                const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
                const passed = f1 >= passThreshold;

                if (passed) passedCases++;

                caseResults.push({
                    caseId: caseData.id,
                    input: caseData.input,
                    expected: caseData.expected,
                    actual,
                    tp,
                    fp,
                    fn,
                    precision,
                    recall,
                    f1,
                    passed,
                    details,
                });

                this.printInfo(`  [${caseData.id}] P=${precision.toFixed(2)} R=${recall.toFixed(2)} F1=${f1.toFixed(2)} ${passed ? '✅' : '❌'}`);
            }

            const avgPrecision = caseResults.reduce((sum, r) => sum + r.precision, 0) / caseResults.length;
            const avgRecall = caseResults.reduce((sum, r) => sum + r.recall, 0) / caseResults.length;
            const avgF1 = caseResults.reduce((sum, r) => sum + r.f1, 0) / caseResults.length;
            const overallPass = avgF1 >= passThreshold;

            const result: MatchEvalResult = {
                timestamp: new Date().toISOString(),
                minScoreThreshold: minScore,
                totalCases: caseResults.length,
                passedCases,
                failedCases: caseResults.length - passedCases,
                avgPrecision,
                avgRecall,
                avgF1,
                caseResults,
            };

            // Write report
            await mkdir(outputDir, { recursive: true });
            const reportPath = join(outputDir, `match-eval-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
            await writeFile(reportPath, JSON.stringify(result, null, 2));

            if (args.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                this.printSummary(result, reportPath, passThreshold);
            }

            return overallPass ? 0 : 1;
        } catch (error) {
            return this.handleError(error, 'Match evaluation failed');
        }
    }

    private printSummary(result: MatchEvalResult, reportPath: string, passThreshold: number): void {
        console.log('\n' + '='.repeat(60));
        console.log('🔗 MATCH QUALITY EVALUATION REPORT');
        console.log('='.repeat(60));
        console.log(`Timestamp: ${result.timestamp}`);
        console.log(`Report: ${reportPath}`);
        console.log(`Threshold: minScore >= ${result.minScoreThreshold}, pass F1 >= ${passThreshold}`);
        console.log('');
        console.log(`Total cases: ${result.totalCases}`);
        console.log(`Passed: ${result.passedCases}`);
        console.log(`Failed: ${result.failedCases}`);
        console.log('');
        console.log(`Avg Precision: ${result.avgPrecision.toFixed(3)}`);
        console.log(`Avg Recall:    ${result.avgRecall.toFixed(3)}`);
        console.log(`Avg F1:        ${result.avgF1.toFixed(3)}`);
        console.log('');
        console.log(`Pass threshold (mean F1 >= ${passThreshold}): ${result.avgF1 >= passThreshold ? '✅ PASSED' : '❌ FAILED'}`);
        console.log('='.repeat(60));

        if (result.avgF1 < passThreshold) {
            console.log('\n⚠️  Mean F1 below pass threshold. Consider:');
            console.log('   - Improving ontology/property extraction');
            console.log('   - Adding more offer notes to corpus');
            console.log('   - Adjusting match scoring weights');
        }
    }
}

registerCommand(EvalMatchCommand);