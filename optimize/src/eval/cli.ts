#!/usr/bin/env node
/**
 * Eval CLI — Evaluation runner with case manifest, quality runner, and verdict
 */

import { Command } from 'commander';
import { readManifest, readIntentCases, readQualityCases, verifyManifest, generateManifest, writeManifest } from '@notention/core/eval/caseManifest';
import { runAllQuality, type QualityRunConfig } from '@notention/core/eval/quality';
import { computeRunVerdict, type RunVerdict, type VerdictConfig } from '@notention/core/eval/verdict';
import { getRevisionStore } from '@notention/core/telemetry/revisionStore';
import { logEvent, getRunEvents, exportRun } from '@notention/core/telemetry/ledger';
import { ExtractionPipeline, createExtractionPipeline } from '@notention/core/extraction';
import { MatchEngine } from '@notention/core/matching';
import { OntologyService } from '@notention/core/ontology/ontologyService';
import { type OntologyNode, type Note, type Property } from '@notention/core/types';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const program = new Command();

program
    .name('pnpm eval')
    .description('Notention Evaluation Runner')
    .version('1.0.0');

// --- Manifest commands ---
program
    .command('manifest:generate')
    .description('Generate case manifest from case files')
    .action(() => {
        const manifest = generateManifest();
        writeManifest(manifest);
        console.log(`✅ Manifest generated: ${manifest.hash}`);
        console.log(`   Intent: ${manifest.counts.intent.search} search, ${manifest.counts.intent.validation} validation, ${manifest.counts.intent.holdout} holdout`);
        console.log(`   Quality: ${manifest.counts.quality.extraction} extraction, ${manifest.counts.quality.match} match`);
    });

program
    .command('manifest:verify')
    .description('Verify manifest integrity')
    .action(() => {
        const result = verifyManifest();
        if (result.valid) {
            console.log('✅ Manifest verification passed');
        } else {
            console.error(`❌ Manifest verification failed: ${result.error}`);
            process.exit(1);
        }
    });

// --- Quality evaluation command ---
program
    .command('quality')
    .description('Run quality evaluation suite')
    .option('-f, --family <family>', 'Quality family: extraction | match', 'all')
    .option('-r, --repetitions <n>', 'Number of repetitions per case', '1')
    .option('-o, --output <dir>', 'Output directory for results', 'eval/runs')
    .action(async (options) => {
        const manifest = readManifest();
        console.log(`📋 Running quality evaluation (manifest: ${manifest.hash})`);
        
        const repetitions = parseInt(options.repetitions, 10);
        const qualityConfig: QualityRunConfig = { repetitions };
        
        const results = await runQualityEvaluation(qualityConfig);
        
        console.log('\n✅ Quality evaluation complete');
        console.log(`   Total cases: ${results.length}`);
        
        const extractionResults = results.filter(r => r.qualityFamily === 'extraction');
        const matchResults = results.filter(r => r.qualityFamily === 'match');
        
        if (extractionResults.length > 0) {
            const avgF1 = extractionResults.reduce((sum, r) => sum + (r.metrics.f1 ?? 0), 0) / extractionResults.length;
            console.log(`   Extraction: ${extractionResults.length} cases, avg F1: ${avgF1.toFixed(3)}`);
        }
        
        if (matchResults.length > 0) {
            const avgF1 = matchResults.reduce((sum, r) => sum + (r.metrics.f1 ?? 0), 0) / matchResults.length;
            console.log(`   Match: ${matchResults.length} cases, avg F1: ${avgF1.toFixed(3)}`);
        }
    });

// --- Intent evaluation command (browser-based) ---
program
    .command('intent')
    .description('Run intent evaluation suite (requires browser)')
    .option('-s, --split <split>', 'Split: search | validation | holdout', 'search')
    .option('-r, --repetitions <n>', 'Repetitions per case', '3')
    .option('--headless', 'Run headless', true)
    .action(async (options) => {
        const manifest = readManifest();
        console.log(`📋 Running intent evaluation (split: ${options.split}, manifest: ${manifest.hash})`);
        console.log('⚠️  Browser harness not yet implemented');
        
        const cases = readIntentCases(options.split as 'search' | 'validation' | 'holdout', manifest);
        console.log(`\nIntent cases (${cases.length}):`);
        for (const c of cases) {
            console.log(`  - ${c.id}: ${c.prompt.slice(0, 60)}...`);
        }
    });

// --- Full evaluation run ---
program
    .command('run')
    .description('Run full evaluation (quality + intent)')
    .option('-r, --revision <id>', 'Revision ID to evaluate')
    .option('-b, --baseline <id>', 'Baseline revision ID', 'incumbent')
    .option('--repetitions <n>', 'Repetitions per case', '3')
    .option('-o, --output <dir>', 'Output directory', 'eval/runs')
    .action(async (options) => {
        const revisionStore = getRevisionStore();
        
        const revisionId = options.revision;
        const baselineRevisionId = options.baseline;
        const repetitions = parseInt(options.repetitions, 10);
        
        console.log(`🚀 Starting evaluation run`);
        console.log(`   Candidate: ${revisionId}`);
        console.log(`   Baseline: ${baselineRevisionId}`);
        console.log(`   Repetitions: ${repetitions}`);
        
        // Generate run ID
        const manifest = readManifest();
        const runId = `run-${manifest.hash}-${revisionId}-${Date.now()}`;
        
        // Log run start
        logEvent({
            type: 'run:started',
            actor: 'system',
            runId,
            revisionId,
            payload: {
                type: 'run:started',
                config: { manifestHash: manifest.hash, revisionId, baselineRevisionId, repetitions },
                caseIds: manifest.cases.map(c => c.id),
            },
        });
        
        try {
            // Load revisions
            const candidateRev = await revisionStore.get(revisionId);
            const baselineRev = await revisionStore.get(baselineRevisionId);
            
            if (!candidateRev) {
                throw new Error(`Candidate revision ${revisionId} not found`);
            }
            if (!baselineRev) {
                throw new Error(`Baseline revision ${baselineRevisionId} not found`);
            }
            
            console.log(`\n📦 Candidate: ${candidateRev.id} (${candidateRev.seamRole})`);
            console.log(`📦 Baseline: ${baselineRev.id} (${baselineRev.seamRole})`);
            
            // Run quality evaluation
            console.log('\n🔬 Running quality suite...');
            const qualityConfig: QualityRunConfig = {
                repetitions,
            };
            
            const qualityResults = await runQualityEvaluation(qualityConfig);
            
            // Run intent evaluation (placeholder)
            console.log('\n🌐 Running intent suite (browser)...');
            const intentResults = await runSimulatedIntent(repetitions);
            
            // Combine all results
            const allCaseResults = [...qualityResults, ...intentResults];
            
            // Compute verdicts
            console.log('\n⚖️  Computing verdicts...');
            const verdictConfig: VerdictConfig = {
                primaryMetric: 'completion',
                mde: {
                    completion: 0.10,
                    steps: -0.5,
                    corrections: -0.2,
                    precision: 0.05,
                    recall: 0.05,
                    f1: 0.05,
                },
                floors: {
                    schemaValidity: 1.0,
                },
                minSampleSize: 30,
            };
            
            const caseVerdicts = computeCaseVerdictsFromResults(allCaseResults, verdictConfig);
            const runVerdict = computeRunVerdict(
                runId,
                manifest.hash,
                revisionId,
                baselineRevisionId,
                caseVerdicts,
                'completion'
            );
            
            // Save results
            const outputDir = join(options.output, runId);
            if (!existsSync(outputDir)) {
                mkdirSync(outputDir, { recursive: true });
            }
            
            writeFileSync(join(outputDir, 'run.json'), JSON.stringify(runVerdict, null, 2));
            writeFileSync(join(outputDir, 'case-results.json'), JSON.stringify(allCaseResults, null, 2));
            
            // Log completion
            logEvent({
                type: 'run:completed',
                actor: 'system',
                runId,
                payload: {
                    type: 'run:completed',
                    summary: {
                        totalCases: runVerdict.summary.improved + runVerdict.summary.degraded + runVerdict.summary.inconclusive,
                        completed: runVerdict.summary.improved + runVerdict.summary.degraded + runVerdict.summary.inconclusive,
                        failed: runVerdict.summary.invalid,
                        overallVerdict: runVerdict.overallVerdict,
                    },
                },
            });
            
            // Print summary
            console.log('\n✅ Evaluation complete');
            console.log(`   Run ID: ${runId}`);
            console.log(`   Overall: ${runVerdict.overallVerdict.toUpperCase()}`);
            console.log(`   Improved: ${runVerdict.summary.improved}`);
            console.log(`   Degraded: ${runVerdict.summary.degraded}`);
            console.log(`   Inconclusive: ${runVerdict.summary.inconclusive}`);
            console.log(`   Invalid: ${runVerdict.summary.invalid}`);
            console.log(`   Results: ${outputDir}/run.json`);
            
            // Exit code based on verdict
            process.exit(runVerdict.overallVerdict === 'improved' ? 0 : 1);
            
        } catch (e) {
            const error = e instanceof Error ? e.message : String(e);
            console.error(`\n❌ Evaluation failed: ${error}`);
            
            logEvent({
                type: 'run:failed',
                actor: 'system',
                runId,
                payload: { type: 'run:failed', error },
            });
            
            process.exit(1);
        }
    });

// --- Ledger commands ---
program
    .command('ledger:show')
    .description('Show ledger events for a run')
    .argument('<runId>', 'Run ID')
    .action((runId) => {
        const events = getRunEvents(runId);
        console.log(JSON.stringify(events, null, 2));
    });

program
    .command('ledger:export')
    .description('Export run events as JSON')
    .argument('<runId>', 'Run ID')
    .option('-o, --output <file>', 'Output file (stdout if omitted)')
    .action((runId, options) => {
        const json = exportRun(runId);
        if (options.output) {
            writeFileSync(options.output, json);
            console.log(`✅ Exported to ${options.output}`);
        } else {
            console.log(json);
        }
    });

// --- Revision commands ---
program
    .command('revision:create')
    .description('Create a new revision')
    .option('-s, --seam <role>', 'Seam role', 'capture')
    .option('-a, --author <type>', 'Author: human | model', 'human')
    .option('-m, --model <id>', 'Model ID (if author=model)')
    .option('-p, --params <json>', 'Strategy params as JSON', '{}')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .action(async (options) => {
        const revisionStore = getRevisionStore();
        
        const strategy = {
            id: `strat_${Date.now()}`,
            seamId: options.seam,
            version: '1.0.0',
            params: JSON.parse(options.params),
        };
        
        const revision = await revisionStore.create({
            seamRole: options.seam,
            strategy,
            author: options.author as 'human' | 'model',
            model: options.model,
            tags: options.tags?.split(',').map((t: string) => t.trim()),
        });
        
        console.log(`✅ Created revision: ${revision.id}`);
        console.log(`   Seam: ${revision.seamRole}`);
        console.log(`   Author: ${revision.author}`);
        console.log(`   Status: ${revision.status}`);
    });

program
    .command('revision:list')
    .description('List revisions')
    .option('-s, --seam <role>', 'Filter by seam role')
    .option('--status <status>', 'Filter by status')
    .option('-l, --limit <n>', 'Limit results', '20')
    .action(async (options) => {
        const revisionStore = getRevisionStore();
        
        const revisions = await revisionStore.search({
            seamRole: options.seam,
            status: options.status as any,
            limit: parseInt(options.limit, 10),
        });
        
        console.log(`Revisions (${revisions.length}):`);
        for (const r of revisions) {
            console.log(`  ${r.id} | ${r.seamRole} | ${r.status} | ${r.author} | ${r.createdAt}`);
        }
    });

program
    .command('revision:activate')
    .description('Activate a revision')
    .argument('<id>', 'Revision ID')
    .option('-u, --user <id>', 'User ID', 'system')
    .action(async (id, options) => {
        const revisionStore = getRevisionStore();
        const revision = await revisionStore.activate(id, options.user);
        
        if (revision) {
            console.log(`✅ Activated revision: ${revision.id}`);
        } else {
            console.error(`❌ Revision not found: ${id}`);
            process.exit(1);
        }
    });

program
    .command('revision:consent')
    .description('Grant/deny consent for a revision')
    .argument('<id>', 'Revision ID')
    .argument('<grant|deny>', 'Action')
    .option('-u, --user <id>', 'User ID', 'system')
    .option('-r, --reason <text>', 'Reason for denial')
    .action(async (id, action, options) => {
        const revisionStore = getRevisionStore();
        
        if (action === 'grant') {
            const revision = await revisionStore.grantConsent(id, options.user);
            if (revision) {
                console.log(`✅ Consent granted for: ${revision.id}`);
            } else {
                console.error(`❌ Revision not found: ${id}`);
                process.exit(1);
            }
        } else {
            const revision = await revisionStore.denyConsent(id, options.user, options.reason ?? 'No reason provided');
            if (revision) {
                console.log(`❌ Consent denied for: ${revision.id}`);
            } else {
                console.error(`❌ Revision not found: ${id}`);
                process.exit(1);
            }
        }
    });

// --- Helper functions ---

// Default ontology for evaluation
const DEFAULT_ONTOLOGY: OntologyNode[] = [];

// Create extraction engine adapter
function createExtractionEngine() {
    const pipeline = createExtractionPipeline();
    
    return {
        async extract(input: string): Promise<Record<string, string[]>> {
            const result = await pipeline.extract(input, DEFAULT_ONTOLOGY);
            const extracted: Record<string, string[]> = {};
            for (const prop of result.properties) {
                extracted[prop.key] = prop.values;
            }
            return extracted;
        },
    };
}

// Create match engine adapter
function createMatchEngine() {
    const matchEngine = new MatchEngine(DEFAULT_ONTOLOGY);
    
    return {
        async match(query: string, notes: Note[]): Promise<Array<{ noteId: string; score: number }>> {
            // Create a request note from the query
            const extractionPipeline = createExtractionPipeline();
            const extractionResult = await extractionPipeline.extract(query, DEFAULT_ONTOLOGY);
            const requestProps = extractionResult.properties;
            
            const now = new Date().toISOString();
            const requestNote: Note = {
                id: 'query',
                title: '',
                content: query,
                properties: requestProps,
                tags: [],
                createdAt: now,
                updatedAt: now,
                status: 'open',
                source: { type: 'user', identifier: 'test', timestamp: Date.now() },
                privacy: 'private',
                priority: 0,
            };
            
            const results: Array<{ noteId: string; score: number }> = [];
            
            for (const note of notes) {
                const matchResult = matchEngine.calculateMatchScore(requestNote, note);
                results.push({
                    noteId: note.id,
                    score: matchResult.score,
                });
            }
            
            return results.sort((a, b) => b.score - a.score);
        },
    };
}

// Sample notes for match evaluation
function createSampleNotes(): Note[] {
    const now = new Date().toISOString();
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
    
    return [
        {
            id: 'note-1',
            title: 'React Developer',
            content: 'Senior React developer available for 2 weeks, rate 900 USD',
            properties: [
                { key: 'role', operator: 'is', values: ['react developer'] },
                { key: 'duration', operator: 'less than', values: ['2 weeks'] },
                { key: 'budget', operator: 'less than', values: ['900 USD'] },
            ],
            tags: ['dev', 'react'],
            createdAt: dayAgo,
            updatedAt: dayAgo,
            status: 'open',
            source: { type: 'user', identifier: 'test', timestamp: Date.now() - 86400000 },
            privacy: 'private',
            priority: 0,
        },
        {
            id: 'note-2',
            title: 'Wheelchair Ramp Installation',
            content: 'Can install wheelchair ramp before Friday, budget 900 USD',
            properties: [
                { key: 'task', operator: 'is', values: ['wheelchair ramp'] },
                { key: 'deadline', operator: 'is', values: ['friday'] },
                { key: 'budget', operator: 'less than', values: ['900 USD'] },
            ],
            tags: ['care', 'accessibility'],
            createdAt: twoDaysAgo,
            updatedAt: twoDaysAgo,
            status: 'open',
            source: { type: 'user', identifier: 'test', timestamp: Date.now() - 172800000 },
            privacy: 'private',
            priority: 0,
        },
    ];
}

async function runQualityEvaluation(config: QualityRunConfig) {
    console.log('  Running quality evaluation with real engines...');
    
    const extractionEngine = createExtractionEngine();
    const matchEngine = createMatchEngine();
    const notes = createSampleNotes();
    
    const qualityConfig: QualityRunConfig = {
        ...config,
        extractionEngine,
        matchEngine,
        notes,
    };
    
    const results = await runAllQuality(qualityConfig);
    return results;
}

async function runSimulatedIntent(repetitions: number) {
    console.log('  (simulated - browser harness not implemented)');
    return [];
}

function computeCaseVerdictsFromResults(results: any[], config: VerdictConfig) {
    // Placeholder - in real implementation, pair baseline/candidate results
    return [];
}

program.parse();