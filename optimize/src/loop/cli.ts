#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, writeFile, readFile, readdir } from 'fs/promises';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { ComponentScanner } from '../discovery/componentScanner.js';
import { TsAstScanner } from '../discovery/tsAstScanner.js';
import { TypeSchemaBuilder } from '../discovery/typeSchema.js';
import { OntologyAdapter } from '../discovery/ontologyAdapter.js';
import { GoldenCaseMiner } from '../discovery/goldenCaseMiner.js';
import { discoverSeams } from '../discovery/seams.js';
import { analyzeDuplicates } from '../discovery/duplicates.js';
import { loadLoopConfig, validateLoopConfig } from '../utils/loopConfig.js';
import { loadTaxonomy, validateTaxonomy } from '../utils/taxonomy.js';
import { StrategySpecGenerator, generateAllCandidates, runStaticGates, runGatesOnCandidateDir, runFastEvaluation, runFastBaselineEvaluation, loadOrRunFastBaseline, adoptWinner, generateT4FromFailedCandidates } from '../synthesis/index.js';
import { deriveProblemsFromDiscovery, prioritizeProblems, type DiscoveredProblem, type PrioritizedProblem } from './prioritize.js';
import type { Seam } from '../discovery/seams.js';

interface LoopParsedFlags {
    json: boolean;
    dry: boolean;
    output: string;
    positionals: string[];
}

function parseLoopFlags(args: string[]): LoopParsedFlags {
    const json = args.includes('--json');
    const dry = args.includes('--dry');

    let output = 'loop/runs';
    const outputIndex = args.findIndex(r => r === '--output');
    if (outputIndex !== -1 && outputIndex + 1 < args.length) {
        output = args[outputIndex + 1];
    } else {
        const outputFlag = args.find(r => r.startsWith('--output='));
        if (outputFlag) output = outputFlag.split('=')[1];
    }

    const flagSet = new Set(['--json', '--dry', '--output']);
    const positionals = args.filter((r, i) => {
        if (flagSet.has(r)) return false;
        if (r.startsWith('--output=')) return false;
        if (i === outputIndex + 1 && args[outputIndex] === '--output') return false;
        return true;
    });

    return { json, dry, output, positionals };
}

function printLoopHelp(): void {
    console.log(`
Usage: pnpm loop <command> [args]

Commands:
  discover [--dry] [--output <dir>]     Discover seams, strategies, tasks, golden cases
  prioritize [--dry] [--output <dir>]   Prioritize discovered problems by impact
  synthesize [--dry] [--output <dir>]   Synthesize candidate strategies (T1-T2)
  evaluate [--dry] [--output <dir>]     Evaluate candidates against baseline
  adopt [--dry] [--output <dir>]        Adopt winning candidate with evidence gate
  request [--dry] [--output <dir>]      Emit T4 request for human implementation
  run [--dry] [--output <dir>]          Run full discover→prioritize→synthesize→evaluate→adopt cycle
  help                                  Show this help

Options:
  --json                   Output as JSON
  --dry                    Dry run (no file writes)
  --output <dir>           Output directory for artifacts (default: loop/runs)
`);
}

async function ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
}

async function runDiscover(config: any, outputDir: string, dry: boolean, json: boolean): Promise<number> {
    console.log('🔍 Discovering components, seams, tasks, and golden cases...\n');

    const sourceDirs = config.discovery.sourceDirs || ['ui/src', 'core/src', 'simulator/src'];
    const excludePatterns = config.discovery.excludePatterns || ['**/*.test.*', '**/*.spec.*', '**/tests/**', '**/fixtures/**', '**/dist/**', '**/node_modules/**'];

    // 1. Scan components
    console.log('  📦 Scanning components...');
    const componentScanner = new ComponentScanner();
    const discovery = componentScanner.scan();
    const components = discovery.components;
    console.log(`     Found ${components.length} components with props`);

    // 2. Discover seams
    console.log('  🔗 Discovering seams...');
    const seams = await discoverSeams(components);
    console.log(`     Found ${seams.length} seams`);

    // 3. Analyze duplicates
    console.log('  🔍 Analyzing duplicates...');
    const duplicateAnalysis = await analyzeDuplicates(components, seams);
    console.log(`     Found ${duplicateAnalysis.duplicateGroups.length} duplicate groups, ${duplicateAnalysis.deadComponents.length} dead components, ${duplicateAnalysis.inlinedCandidates.length} inline candidates`);
    console.log(`     Actionable findings: ${duplicateAnalysis.summary.actionableFindings}`);

    // 4. Build type schemas
    console.log('  📐 Building type schemas...');
    const typeSchemaResult = TypeSchemaBuilder.fromProject();
    const typeSchemas = typeSchemaResult.types;
    console.log(`     Built ${typeSchemas.size} type schemas`);

    // 5. Ontology adapter
    console.log('  📚 Loading ontology...');
    const ontologyAdapter = new OntologyAdapter();
    const ontology = await ontologyAdapter.load();
    console.log(`     Loaded ontology with ${ontology.properties.length} properties`);

    // 6. Mine golden cases
    console.log('  🏆 Mining golden cases...');
    const goldenCaseMiner = new GoldenCaseMiner('doc/evidence');
    // Mine from evidence bundles
    const evidenceCases = await goldenCaseMiner.mine({ minConfidence: 0.5, maxCases: 20 });
    // Mine from test files
    const testCases = goldenCaseMiner.mineFromTests(['core/src/tests', 'ui/src/tests', 'optimize/src/tests']);
    // Load curated cases from static file
    const curatedCases = goldenCaseMiner.loadCuratedCases('loop/golden-cases.json');
    // Combine and deduplicate
    const goldenCases = [...evidenceCases, ...testCases, ...curatedCases].filter((c, i, arr) => 
        arr.findIndex(x => x.input === c.input) === i
    ).slice(0, 50);
    console.log(`     Mined ${goldenCases.length} golden cases (${evidenceCases.length} from evidence, ${testCases.length} from tests, ${curatedCases.length} curated)`);

    // 7. Derive tasks from taxonomy × ontology × friction
    console.log('  📋 Deriving tasks...');
    const taxonomy = await loadTaxonomy('loop/taxonomy.json');
    const tasks = deriveTasks(taxonomy, ontology, seams);
    console.log(`     Derived ${tasks.length} tasks`);

    // Assemble discovered artifact
    const discovered = {
        timestamp: new Date().toISOString(),
        version: config.version,
        components: components.map(c => ({ name: c.name, file: c.file, props: c.props })),
        seams: seams.map(s => ({ id: s.id, name: s.name, role: s.role, components: s.components, propsShape: s.propsShape })),
        typeSchemas: Array.from(typeSchemas.entries()).map(([k, v]) => ({ key: k, schema: v })),
        ontology: { properties: ontology.properties, operators: ontology.operators },
        duplicateAnalysis: {
            duplicateGroups: duplicateAnalysis.duplicateGroups.map(g => ({
                signature: g.signature,
                primary: g.primary,
                duplicates: g.duplicates,
                reason: g.reason,
            })),
            deadComponents: duplicateAnalysis.deadComponents.map(d => ({
                component: d.component.name,
                reason: d.reason,
                confidence: d.confidence,
            })),
            inlinedCandidates: duplicateAnalysis.inlinedCandidates.map(i => ({
                component: i.component.name,
                reason: i.reason,
                suggestedAction: i.suggestedAction,
            })),
            summary: duplicateAnalysis.summary,
        },
        tasks: tasks.map(t => ({ id: t.id, name: t.name, type: t.type, seam: t.seam, acceptance: t.acceptance })),
    };

    // Write separate artifact files
    if (!dry) {
        await ensureDir(outputDir);
        await writeFile(join(outputDir, 'discovered.json'), JSON.stringify(discovered, null, 2));
        
        const tasksJson = {
            timestamp: discovered.timestamp,
            version: config.version,
            tasks: discovered.tasks,
        };
        await writeFile(join(outputDir, 'tasks.json'), JSON.stringify(tasksJson, null, 2));
        
        const goldenJsonl = goldenCases.map(g => JSON.stringify({
            name: g.name,
            input: g.input,
            expected: g.expected,
            forbidden: g.forbidden,
            expectedOutcome: g.expectedOutcome,
            metadata: g.metadata,
        })).join('\n');
        await writeFile(join(outputDir, 'golden.jsonl'), goldenJsonl + '\n');
        
        console.log(`\n✅ Discovered artifacts written to ${outputDir}/`);
        console.log(`   - discovered.json (full artifact)`);
        console.log(`   - tasks.json (task definitions)`);
        console.log(`   - golden.jsonl (golden cases)`);
    } else {
        console.log('\n🔍 Dry run - no files written');
        if (json) console.log(JSON.stringify(discovered, null, 2));
    }

    return 0;
}

function deriveTasks(taxonomy: any, ontology: any, seams: any[]): any[] {
    const tasks: any[] = [];
    const taskId = 1;

    // Task 1: Capture need with ≥3 properties in <20s
    tasks.push({
        id: 'task-1',
        name: 'Capture need with ≥3 properties in <20s',
        type: 'capture',
        seam: 'capture',
        acceptance: { minProperties: 3, maxTimeSeconds: 20 },
    });

    // Task 2: Capture offer → ≥1 match without re-edit
    tasks.push({
        id: 'task-2',
        name: 'Capture offer → ≥1 match without re-edit',
        type: 'match',
        seam: 'match-display',
        acceptance: { minMatches: 1, maxReedits: 0 },
    });

    // Task 3: Paragraph → valid structured note
    tasks.push({
        id: 'task-3',
        name: 'Paragraph → valid structured note',
        type: 'extraction',
        seam: 'extraction',
        acceptance: { schemaValid: true, minFields: 3 },
    });

    // Task 4: Open note → commitment with status+deadline
    tasks.push({
        id: 'task-4',
        name: 'Open note → commitment with status+deadline',
        type: 'commitment',
        seam: 'intent-surface',
        acceptance: { hasStatus: true, hasDeadline: true },
    });

    // Task 5: Find note by intent
    tasks.push({
        id: 'task-5',
        name: 'Find note by intent',
        type: 'search',
        seam: 'intent-surface',
        acceptance: { findsTarget: true },
    });

    // Task 6: Add missing detail after failed match
    tasks.push({
        id: 'task-6',
        name: 'Add missing detail after failed match',
        type: 'recovery',
        seam: 'detail-elicitation',
        acceptance: { recoversFromFailure: true },
    });

    return tasks;
}

async function runSynthesize(config: any, outputDir: string, dry: boolean, json: boolean): Promise<number> {
    console.log('🔧 Synthesizing candidate strategies...\n');

    // Load discovered artifacts
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const discoveredPath = path.join(outputDir, 'discovered.json');
    let discovered: any;
    
    try {
        const content = await fs.readFile(discoveredPath, 'utf-8');
        discovered = JSON.parse(content);
        console.log(`  📄 Loaded discovered artifacts from ${discoveredPath}`);
    } catch {
        console.log('  ⚠️  No discovered.json found, running discovery first...');
        // Run discovery inline
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
    const candidatesDir = await generateAllCandidates(seams, path.join(outputDir, 'candidates'));
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
                if (!result.pass) {
                    console.log(`        - ${gateName}: ${result.errors.join(', ')}`);
                }
            }
        }
    }

    // Save gate reports
    if (!dry) {
        await ensureDir(outputDir);
        const reportsPath = path.join(outputDir, 'gate-reports.json');
        await fs.writeFile(reportsPath, JSON.stringify(gateReports, null, 2));
        console.log(`\n✅ Gate reports written to ${reportsPath}`);
    } else {
        console.log('\n🔍 Dry run - no files written');
    }

    console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);
    return failed > 0 ? 1 : 0;
}

async function runEvaluate(config: any, outputDir: string, dry: boolean, _json: boolean): Promise<number> {
    console.log('📊 Evaluating candidates against baseline (fast mode)...\n');

    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Load gate reports to get passed candidates
    const gateReportsPath = path.join(outputDir, 'gate-reports.json');
    let candidatesDir;
    
    try {
        const gateContent = await fs.readFile(gateReportsPath, 'utf-8');
        const gateReports = JSON.parse(gateContent);
        
        // Load candidates from candidates directory
        const candidatesPath = path.join(outputDir, 'candidates');
        const { loadCandidates } = await import('../synthesis/StrategySpec.js');
        candidatesDir = await loadCandidates(candidatesPath);
        
        // Filter to only candidates that passed gates
        const passedCandidateIds = new Set(
            gateReports
                .filter((r: any) => r.overallPass)
                .map((r: any) => r.candidateId)
        );
        
        // Remove failed candidates
        for (const id of candidatesDir.candidates.keys()) {
            if (!passedCandidateIds.has(id)) {
                candidatesDir.candidates.delete(id);
            }
        }
        
        console.log(`  📋 Loaded ${candidatesDir.candidates.size} gate-passed candidates`);
    } catch {
        console.log('  ⚠️  No gate reports or candidates found. Run synthesize first.');
        return 1;
    }

    if (candidatesDir.candidates.size === 0) {
        console.log('  ❌ No candidates passed static gates');
        return 1;
    }

    // Run fast baseline evaluation (no browser)
    console.log('  📏 Running fast baseline evaluation...');
    const baselinePath = path.join(outputDir, 'baseline.json');
    const baseline = await loadOrRunFastBaseline(baselinePath);
    
    if (!dry) {
        await ensureDir(outputDir);
        await fs.writeFile(baselinePath, JSON.stringify(baseline, null, 2));
    }

    // Run fast evaluation on candidates
    console.log('  🚀 Running fast candidate evaluation...');
    const report = await runFastEvaluation(candidatesDir, baseline);
    
    // Summary
    const passedCandidates = report.candidates.filter(c => c.passed).length;
    const baselineOverall = (report.baseline.reduce((s, b) => s + b.successRate, 0) / report.baseline.length * 100).toFixed(1);
    console.log(`\n📊 Evaluation Summary:`);
    console.log(`   Baseline overall success rate: ${baselineOverall}%`);
    console.log(`   Candidates evaluated: ${report.candidates.length}`);
    console.log(`   Candidates beating baseline: ${passedCandidates}`);
    
    // Print task details
    for (const task of report.baseline) {
        const status = task.successRate === 1 ? '✅' : '❌';
        console.log(`   ${status} ${task.taskId}: ${(task.successRate * 100).toFixed(0)}% (${task.medianDuration}ms)`);
        if (task.errors.length > 0) {
            console.log(`      Errors: ${task.errors.join('; ')}`);
        }
    }

    if (dry) {
        console.log('\n🔍 Dry run - no files written');
    } else {
        // Convert Maps to objects for JSON serialization
        const serializableReport = {
            baseline: report.baseline,
            candidates: report.candidates.map(c => ({
                ...c,
                taskResults: Object.fromEntries(c.taskResults),
            })),
            timestamp: report.timestamp,
        };
        await fs.writeFile(path.join(outputDir, 'evaluation-report.json'), JSON.stringify(serializableReport, null, 2));
        console.log(`\n✅ Evaluation report written to ${outputDir}/evaluation-report.json`);
    }
    
    return passedCandidates > 0 ? 0 : 1;
}

async function runAdopt(config: any, outputDir: string, dry: boolean, _json: boolean): Promise<number> {
    console.log('✅ Adopting winning candidate...\n');

    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Load evaluation report
    const evalPath = path.join(outputDir, 'evaluation-report.json');
    let evaluationReport: any;
    
    try {
        const content = await fs.readFile(evalPath, 'utf-8');
        evaluationReport = JSON.parse(content);
        console.log(`  📄 Loaded evaluation report from ${evalPath}`);
    } catch {
        console.log('  ❌ No evaluation-report.json found. Run evaluate first.');
        return 1;
    }

    // Load candidates
    const candidatesPath = path.join(outputDir, 'candidates');
    const { loadCandidates } = await import('../synthesis/StrategySpec.js');
    const candidatesDir = await loadCandidates(candidatesPath);
    
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
        await ensureDir(outputDir);
        const adoptionPath = path.join(outputDir, 'adoption.json');
        const adoptionInfo = { 
            artifact: { id: artifact.id, kind: artifact.kind, version: artifact.version, interface: artifact.interface },
            adoptedAt: new Date().toISOString() 
        };
        console.log('DEBUG: Writing adoption info...');
        await fs.writeFile(adoptionPath, JSON.stringify(adoptionInfo, null, 2));
        console.log(`\n✅ Adoption complete. Artifact saved to ${adoptionPath}`);
    } else {
        console.log('\n🔍 Dry run - no files written');
    }

    return 0;
}

async function runPrioritize(config: any, outputDir: string, dry: boolean, json: boolean): Promise<number> {
    console.log('📊 Prioritizing discovered problems by impact...\n');

    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Load discovered artifacts
    const discoveredPath = path.join(outputDir, 'discovered.json');
    let discovered: any;
    
    try {
        const content = await fs.readFile(discoveredPath, 'utf-8');
        discovered = JSON.parse(content);
        console.log(`  📄 Loaded discovered artifacts from ${discoveredPath}`);
    } catch {
        console.log('  ❌ No discovered.json found. Run discover first.');
        return 1;
    }

    // Derive problems from discovery
    const problems = deriveProblemsFromDiscovery(discovered);
    console.log(`  🔍 Derived ${problems.length} problems from discovery`);

    // Prioritize
    const prioritized = prioritizeProblems(problems);
    
    console.log('\n📋 Prioritized Problems:');
    for (const p of prioritized) {
        console.log(`   ${p.rank}. [${p.impactScore}] ${p.type}: ${p.description}`);
        if (!dry) console.log(`      Evidence: ${p.evidence.join('; ')}`);
    }

    // Save prioritized problems
    if (!dry) {
        await ensureDir(outputDir);
        const prioritizedPath = path.join(outputDir, 'prioritized.json');
        await fs.writeFile(prioritizedPath, JSON.stringify(prioritized, null, 2));
        console.log(`\n✅ Prioritized problems written to ${prioritizedPath}`);
    } else {
        console.log('\n🔍 Dry run - no files written');
        if (json) console.log(JSON.stringify(prioritized, null, 2));
    }

    return 0;
}

async function runRequest(config: any, outputDir: string, dry: boolean, _json: boolean): Promise<number> {
    console.log('📝 Emitting T4 request from evaluation evidence...\n');

    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Load evaluation report
    const evalPath = path.join(outputDir, 'evaluation-report.json');
    let evaluationReport: any;
    
    try {
        const content = await fs.readFile(evalPath, 'utf-8');
        evaluationReport = JSON.parse(content);
        console.log(`  📄 Loaded evaluation report from ${evalPath}`);
    } catch {
        console.log('  ❌ No evaluation-report.json found. Run evaluate first.');
        return 1;
    }

    // Generate T4 requests from failed candidates
    const requests = generateT4FromFailedCandidates(evaluationReport, path.join(outputDir, 'requests'));
    
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

async function runFullLoop(config: any, outputDir: string, dry: boolean, json: boolean): Promise<number> {
    console.log('🔄 Running full discover→prioritize→synthesize→evaluate→adopt cycle...\n');
    
    // Create a timestamped run directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const runDir = dry ? outputDir : path.join(outputDir, `run-${timestamp}`);
    
    if (!dry) {
        await ensureDir(runDir);
    }
    
    console.log(`📁 Output directory: ${runDir}\n`);
    
    // Step 1: Discover
    console.log('━'.repeat(60));
    console.log('STEP 1: DISCOVER');
    console.log('━'.repeat(60));
    const discoverResult = await runDiscover(config, runDir, dry, false);
    if (discoverResult !== 0) {
        console.log('❌ Discover failed, stopping loop');
        return discoverResult;
    }
    
    // Step 2: Prioritize
    console.log('\n━'.repeat(60));
    console.log('STEP 2: PRIORITIZE');
    console.log('━'.repeat(60));
    const prioritizeResult = await runPrioritize(config, runDir, dry, false);
    if (prioritizeResult !== 0) {
        console.log('❌ Prioritize failed, stopping loop');
        return prioritizeResult;
    }
    
    // Step 3: Synthesize
    console.log('\n━'.repeat(60));
    console.log('STEP 3: SYNTHESIZE');
    console.log('━'.repeat(60));
    const synthesizeResult = await runSynthesize(config, runDir, dry, false);
    if (synthesizeResult !== 0) {
        console.log('❌ Synthesize failed (no candidates passed gates), stopping loop');
        return synthesizeResult;
    }
    
    // Step 4: Evaluate
    console.log('\n━'.repeat(60));
    console.log('STEP 4: EVALUATE');
    console.log('━'.repeat(60));
    const evaluateResult = await runEvaluate(config, runDir, dry, false);
    if (evaluateResult !== 0) {
        console.log('❌ Evaluate failed (no candidates beat baseline), stopping loop');
        return evaluateResult;
    }
    
    // Step 5: Adopt
    console.log('\n━'.repeat(60));
    console.log('STEP 5: ADOPT');
    console.log('━'.repeat(60));
    const adoptResult = await runAdopt(config, runDir, dry, false);
    if (adoptResult !== 0) {
        console.log('⚠️  Adopt failed (no winning candidate), but continuing');
    }
    
    // Step 6: Request (T4 for failed candidates)
    console.log('\n━'.repeat(60));
    console.log('STEP 6: REQUEST (T4)');
    console.log('━'.repeat(60));
    await runRequest(config, runDir, dry, false);
    
    console.log('\n━'.repeat(60));
    console.log('✅ FULL LOOP COMPLETE');
    console.log('━'.repeat(60));
    console.log(`Artifacts written to: ${runDir}`);
    
    return 0;
}

async function main(): Promise<number> {
    const rawArgs = process.argv.slice(2);

    if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
        printLoopHelp();
        return 0;
    }

    const { json, dry, output, positionals } = parseLoopFlags(rawArgs);

    if (positionals.length === 0) {
        printLoopHelp();
        return 0;
    }

    const [subcommand, ...rest] = positionals;

    // Load configuration
    const config = await loadLoopConfig('loop/loop.config.json');
    await validateLoopConfig(config);

    try {
        switch (subcommand) {
            case 'discover': {
                return runDiscover(config, output, dry, json);
            }
            case 'prioritize': {
                return runPrioritize(config, output, dry, json);
            }
            case 'synthesize': {
                return runSynthesize(config, output, dry, json);
            }
            case 'evaluate': {
                return runEvaluate(config, output, dry, json);
            }
            case 'adopt': {
                return runAdopt(config, output, dry, json);
            }
            case 'request': {
                return runRequest(config, output, dry, json);
            }
            case 'run': {
                return runFullLoop(config, output, dry, json);
            }
            case 'help': {
                printLoopHelp();
                return 0;
            }
            default:
                throw new Error(`Unknown subcommand: ${subcommand}. Use: discover, prioritize, synthesize, evaluate, adopt, request, run, help`);
        }
    } catch (e) {
        console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
        return 1;
    }
}

main().catch(e => {
    console.error(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
});