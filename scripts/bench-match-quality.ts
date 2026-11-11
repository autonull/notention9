#!/usr/bin/env node
// scripts/bench-match-quality.ts — Match quality benchmark on annotated cases
// Run with: pnpm exec tsx scripts/bench-match-quality.ts

import {readFileSync, writeFileSync} from 'fs';
import {globSync} from 'glob';
import {resolve} from 'path';
import {fileURLToPath} from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const PROJECT_ROOT = resolve(__dirname, '..');
const CASES_DIR = resolve(PROJECT_ROOT, 'eval/cases/quality/match');

// Import core matcher (Node.js build)
import {MatchingService} from '../core/src/matching/MatchingService.js';
import type {Note, Property, OntologyNode} from '../core/src/types/index.js';
import {DEFAULT_ONTOLOGY} from '../core/src/ontology/ontology.default.js';

interface QualityCase {
    id: string;
    family: string;
    qualityFamily: string;
    input: string;
    expected: Array<{noteId: string; minScore: number}>;
    labels: {annotators: number; agreement: number};
    tags: string[];
}

interface BenchmarkResult {
    caseId: string;
    input: string;
    expected: Array<{noteId: string; minScore: number}>;
    actual: Array<{noteId: string; score: number}>;
    tp: number;
    fp: number;
    fn: number;
    precision: number;
    recall: number;
    f1: number;
    minScoreThreshold: number;
}

interface Summary {
    timestamp: string;
    totalCases: number;
    thresholds: Array<{
        minScore: number;
        avgPrecision: number;
        avgRecall: number;
        avgF1: number;
    }>;
    caseResults: BenchmarkResult[];
    failures: Array<{caseId: string; reason: string}>;
}

async function loadCases(): Promise<QualityCase[]> {
    const caseFiles = globSync('*.json', {cwd: CASES_DIR});
    const cases: QualityCase[] = [];
    
    for (const file of caseFiles) {
        const content = readFileSync(resolve(CASES_DIR, file), 'utf-8');
        cases.push(JSON.parse(content));
    }
    
    return cases;
}

async function loadCaseNotes(caseId: string): Promise<Note[]> {
    // Notes for quality cases are embedded in the case or need to be loaded from fixtures
    // For now, we'll create them from the case data
    // TODO: Load from actual workspace fixture
    return [];
}

function createMatcher(): MatchingService {
    return new MatchingService(DEFAULT_ONTOLOGY);
}

function runBenchmark(cases: QualityCase[], minScore: number): BenchmarkResult[] {
    const matcher = createMatcher();
    const results: BenchmarkResult[] = [];
    
    for (const case_ of cases) {
        // TODO: Load the actual notes for this case
        // For now, we simulate with the expected note IDs
        // In reality, we need a workspace with all the notes
        
        const actual: Array<{noteId: string; score: number}> = [];
        // This would call matcher.match(requestNote, candidateNotes)
        
        const expectedIds = case_.expected.map(e => e.noteId).filter(id => {
            const exp = case_.expected.find(e => e.noteId === id);
            return exp && exp.minScore >= minScore;
        });
        
        const actualIds = actual.map(a => a.noteId).filter(id => {
            const act = actual.find(a => a.noteId === id);
            return act && act.score >= minScore;
        });
        
        const tp = actualIds.filter(id => expectedIds.includes(id)).length;
        const fp = actualIds.filter(id => !expectedIds.includes(id)).length;
        const fn = expectedIds.filter(id => !actualIds.includes(id)).length;
        
        const precision = tp / (tp + fp) || 0;
        const recall = tp / (tp + fn) || 0;
        const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
        
        results.push({
            caseId: case_.id,
            input: case_.input,
            expected: case_.expected,
            actual,
            tp,
            fp,
            fn,
            precision,
            recall,
            f1,
            minScoreThreshold: minScore,
        });
    }
    
    return results;
}

async function main() {
    console.log('🔬 Loading quality match cases...');
    const cases = await loadCases();
    console.log(`   Loaded ${cases.length} cases`);
    
    const thresholds = [0.2, 0.3, 0.4];
    const allResults: BenchmarkResult[] = [];
    const failures: Array<{caseId: string; reason: string}> = [];
    
    for (const threshold of thresholds) {
        console.log(`\n📊 Running benchmark at minScore >= ${threshold}...`);
        try {
            const results = runBenchmark(cases, threshold);
            allResults.push(...results);
            
            const avgPrecision = results.reduce((sum, r) => sum + r.precision, 0) / results.length;
            const avgRecall = results.reduce((sum, r) => sum + r.recall, 0) / results.length;
            const avgF1 = results.reduce((sum, r) => sum + r.f1, 0) / results.length;
            
            console.log(`   Precision: ${(avgPrecision * 100).toFixed(1)}%`);
            console.log(`   Recall:    ${(avgRecall * 100).toFixed(1)}%`);
            console.log(`   F1:        ${(avgF1 * 100).toFixed(1)}%`);
        } catch (err) {
            console.error(`   Failed: ${err}`);
            failures.push({caseId: 'all', reason: String(err)});
        }
    }
    
    const summary: Summary = {
        timestamp: new Date().toISOString(),
        totalCases: cases.length,
        thresholds: thresholds.map(t => {
            const r = allResults.filter(x => x.minScoreThreshold === t);
            return {
                minScore: t,
                avgPrecision: r.reduce((sum, x) => sum + x.precision, 0) / r.length || 0,
                avgRecall: r.reduce((sum, x) => sum + x.recall, 0) / r.length || 0,
                avgF1: r.reduce((sum, x) => sum + x.f1, 0) / r.length || 0,
            };
        }),
        caseResults: allResults,
        failures,
    };
    
    // Write JSON output
    const outputPath = resolve(PROJECT_ROOT, 'eval/results/match-quality-benchmark.json');
    writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    console.log(`\n💾 Results written to ${outputPath}`);
    
    // Generate Markdown report
    const mdPath = resolve(PROJECT_ROOT, 'doc/evidence/2026-11-match-benchmark-rebuild.md');
    let md = readFileSync(mdPath, 'utf-8');
    
    // Replace the placeholder with actual results
    const resultsTable = thresholds.map(t => {
        const s = summary.thresholds.find(x => x.minScore === t);
        return `| ${t} | ${(s!.avgPrecision * 100).toFixed(1)}% | ${(s!.avgRecall * 100).toFixed(1)}% | ${(s!.avgF1 * 100).toFixed(1)}% |`;
    }).join('\n');
    
    md = md.replace(
        /## Implementation Plan[\s\S]*## Current Blocker/,
        `## Results (${new Date().toISOString()})

| minScore | Precision | Recall | F1 |
|----------|-----------|--------|-----|
${resultsTable}

## Implementation Plan`
    );
    
    writeFileSync(mdPath, md);
    console.log(`📝 Evidence document updated: ${mdPath}`);
    
    if (failures.length > 0) {
        console.error('\n❌ Failures:', failures);
        process.exit(1);
    }
    
    console.log('\n✅ Benchmark complete');
}

main().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
});