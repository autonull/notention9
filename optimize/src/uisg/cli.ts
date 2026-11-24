#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEvidenceDirSync } from '@notention/core/constants/paths';
import { SEAM_ROLES } from '@notention/core/constants/seams';
import '../journeys.js';
import { getAllJourneys, getJourney } from '../registry.js';
import { generateTestFile } from '../journeyFileGenerator.js';
import { createRunId, runOptimizeTest } from '../runner.js';
import type { EvidenceBundle } from '../evidence.js';
import type { JourneySpec } from '../journey.js';
import { analyzeGraph, journeyTargetDrift } from './analyze.js';
import { compareBundles } from './compare.js';
import { indexGraph, queryGraph } from './query.js';
import { flowToJourney } from './toJourney.js';
import { validateGraph } from './validate.js';
import { buildComponentRegistry, validateAgainstRegistry } from './registry.js';
import { emitManifest } from './manifest.js';
import { scanAll } from './scan.js';
import { syncGraphWithCode } from './sync.js';
import { collectMetrics, loadMetrics } from './metrics.js';
import { rankItems, loadPriority } from './rank.js';
import { selectFeature, loadSelection } from './select.js';
import { ensureContextsFile, listProfiles, loadContexts } from './contexts.js';
import { adoptFlow } from './adopt.js';
import { canonicalize, graphHash, roundTripTest } from './canonicalize.js';
import { diffGraphsCommand, printDiff } from './diff.js';
import { appendRunRecord, loadRuns, loadFindings, markFindingFixed, verifyFinding } from './records.js';
import { loadRegressionCatalogue, runSeededRegressions } from './regressions.js';
import {
    buildSkeleton, emitSkeletonJourneyTest, skeletonJourneyFlows, skeletonJourneyId,
    skeletonOutputs, skeletonToJourney, type UisgSkeleton,
} from './skeleton.js';
import { simulateFlow } from './simulate.js';
import type { UisgGraph } from './types.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const USAGE = `Usage: pnpm uisg <command> [args]

Commands:
  validate [--graph <file>]                 Schema + reference + reachability checks
  query [--type t] [--status s] [--text q] [--seam s] [--journey id] [--source path]
  analyze [--graph <file>] [--strict]       Actionable findings (issue/evidence/impact/change)
  to-journey <flowId> [--seed <file>] [--out <file>] [--conditions a,b] [--ready] [--emit-test [--force]]
  run <flowId> [same flags as to-journey]   Compile, emit the journey test if missing, run it
  skeleton [--write] [--check] [--json]      Emit the generated skeleton preview + preview journeys
  generate [--check]                         Write the preview artifacts and flow manifests
  simulate <flowId> [--conditions a,b]        Walk the graph; report guards, effects, and blocked branches
  matrix [--flows a,b] [--viewports v] [--themes t] [--profiles hand-built,generated] [--no-build]
                                            Run every flow at 2 themes x 2 viewports; record dimensions
  compare <bundleA> <bundleB>               Diff two evidence bundles (run dirs or bundle.json files)
  inventory                                 Graph stats, journey links, seam coverage, variants
  scan [--out <file>]                       Scan codebase for surfaces, navigation, seams, journeys, strategies
  sync [--graph <file>] [--apply]           Compare graph with code; propose repairs (dry-run by default)
  metrics [--days N]                        Ingest friction, latency, probe, eval, drift -> doc/uisg/metrics.json
  rank [--profile <name>]                   Score nodes by (impact*confidence)/effort -> doc/uisg/priority.json
  select <feature> [--context <id>] [--modality <m>] [--theme <t>] [--viewport <v>] [--profile <p>]
                                            Check constraints, return selection + conflicts -> doc/uisg/selection.json
  contexts [--list]                         Manage context profiles (doc/uisg/contexts.json)
  adopt <flowId> --baseline <runId> --variant <runId> --hypothesis <text> --metric <name> --actor <name>
                                            Compare bundles, update lifecycle, record decision
  canonicalize [--graph <file>] [--check-roundtrip]  Canonicalize graph; verify round-trip
  regressions [--graph <file>]              Apply seeded regressions; every expected finding must fire
  check [--graph <file>]                    Gate: validate, analyze --strict, sync, regressions, round-trip
  diff <baseline> <variant> [--semantic]    Semantic diff of two graphs (files, 'current', or 'hash:<id>')
  findings [--mark-fixed <id> --by <name> --run <runId>] [--verify <id> --run <runId>]  Findings repo
  runs [--repair]                            Show recent run records; resolve bundle paths in place

Default graph: doc/uisg/graph.json`;

function parseArgs(argv: string[]) {
    const flags = new Map<string, string>();
    const positionals: string[] = [];
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith('--')) { positionals.push(argv[i]); continue; }
        const key = argv[i].slice(2);
        const next = argv[i + 1];
        flags.set(key, next && !next.startsWith('--') ? argv[++i] : 'true');
    }
    return { flags, positionals };
}

export function loadGraph(flags: Map<string, string>): UisgGraph {
    const file = resolve(ROOT, flags.get('graph') ?? 'doc/uisg/graph.json');
    const result = validateGraph(JSON.parse(readFileSync(file, 'utf8')));
    if (!result.graph) {
        for (const { severity, code, message } of result.issues) console.error(`${severity.toUpperCase()} ${code}: ${message}`);
        throw new Error(`Graph ${file} failed schema validation`);
    }
    return result.graph;
}

export function uiTestIds(): Set<string> {
    const ids = new Set<string>();
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) walk(path);
            else if (/\.tsx?$/.test(entry.name)) {
                const source = readFileSync(path, 'utf8');
                for (const [, id] of source.matchAll(/data-testid="([^"]+)"/g)) ids.add(id);
                for (const [, id] of source.matchAll(/\btestId="([^"]+)"/g)) ids.add(id);
            }
        }
    };
    walk(resolve(ROOT, 'ui/src'));
    return ids;
}

function compileFlow(flowId: string, flags: Map<string, string>): JourneySpec {
    const graph = loadGraph(flags);
    const flow = graph.nodes.find(node => node.id === flowId);
    const linked = flow?.type === 'flow' && flow.journey ? getJourney(flow.journey) : undefined;
    const seedFile = flags.get('seed');
    const seed = seedFile ? JSON.parse(readFileSync(resolve(ROOT, seedFile), 'utf8')) : linked?.seed;
    if (!seed) throw new Error('No seed: pass --seed <file> or link a registered journey');
    const dimensions = {
        viewport: flags.get('viewport'),
        theme: flags.get('theme'),
        profile: flags.get('profile'),
        context: flags.get('context'),
    };
    const spec = flowToJourney(graph, flowId, {
        seed,
        conditions: flags.get('conditions')?.split(','),
        status: flags.has('ready') ? 'ready' : 'draft',
        dimensions: Object.values(dimensions).some(v => v) ? dimensions : undefined,
    });

    // Validate against registry
    const registry = buildComponentRegistry();
    const validation = validateAgainstRegistry(graph, registry);
    if (!validation.ok) {
        for (const err of validation.errors) console.error(`REGISTRY ERROR: ${err}`);
        throw new Error('Registry validation failed');
    }

    // Emit manifest
    emitManifest(flowId, spec, validation.errors);

    return spec;
}

function emitTest(spec: JourneySpec, flags: Map<string, string>): string {
    const file = resolve(ROOT, 'ui/test/optimize', `${spec.id}.journey.ts`);
    if (existsSync(file) && !flags.has('force')) throw new Error(`${file} exists; pass --force to overwrite`);
    writeFileSync(file, generateTestFile(spec));
    return file;
}

function buildOptimize(): number {
    console.log('Building @notention/optimize (Playwright resolves dist)...');
    return spawnSync('pnpm', ['--filter', '@notention/optimize', 'build'], { cwd: ROOT, stdio: 'inherit' }).status ?? 1;
}

function journeyTestFile(id: string): string {
    return resolve(ROOT, 'ui/test/optimize', `${id}.journey.ts`);
}

function grepFor(id: string): string {
    return `(?:^|\\s)${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
}

function dimensionEnv(flags: Map<string, string>): Record<string, string> {
    const env: Record<string, string> = {};
    const viewport = flags.get('viewport');
    const theme = flags.get('theme');
    if (viewport) env.NOTENTION_VIEWPORT = viewport;
    if (theme) env.NOTENTION_THEME = theme;
    return env;
}

function writeSkeletonOutputs(flags: Map<string, string>): { files: string[]; skeleton: UisgSkeleton } {
    const skeleton = buildSkeleton(loadGraph(flags), { flowIds: flags.get('flows')?.split(',') });
    const files = skeletonOutputs(skeleton).map(({ path, content }) => {
        writeFileSync(resolve(ROOT, path), content);
        return path;
    });
    return { files, skeleton };
}

function ensureSkeletonJourney(flowId: string, graph: UisgGraph): JourneySpec | undefined {
    const flow = buildSkeleton(graph, { flowIds: [flowId] }).flows.find(node => node.id === flowId);
    if (!flow) return undefined;
    const journey = skeletonToJourney(flow);
    const file = resolve(ROOT, 'ui/test/optimize', `${journey.id}.journey.ts`);
    if (!existsSync(file)) writeFileSync(file, emitSkeletonJourneyTest(flow));
    return journey;
}

function generateAll(flags: Map<string, string>): { files: number; manifests: number } {
    const graph = loadGraph(flags);
    const { files } = writeSkeletonOutputs(flags);
    let manifests = 0;
    for (const node of graph.nodes) {
        if (node.type !== 'flow' || !node.journey) continue;
        const journey = getJourney(node.journey);
        if (!journey) continue;
        const conditions = [...new Set(graph.edges
            .filter(edge => edge.type === 'next' && edge.when)
            .map(edge => edge.when!))];
        const spec = flowToJourney(graph, node.id, { seed: journey.seed, conditions });
        emitManifest(node.id, spec);
        manifests++;
    }
    return { files: files.length, manifests };
}

function main(): number {
    const [command, ...rest] = process.argv.slice(2);
    const { flags, positionals } = parseArgs(rest);
    if (!command || flags.has('help')) { console.log(USAGE); return command ? 0 : 1; }

    switch (command) {
        case 'validate': {
            const file = resolve(ROOT, flags.get('graph') ?? 'doc/uisg/graph.json');
            const result = validateGraph(JSON.parse(readFileSync(file, 'utf8')));
            for (const { severity, code, message, ref } of result.issues)
                console.log(`${severity.toUpperCase().padEnd(7)} ${code.padEnd(18)} ${message}${ref ? ` [${ref}]` : ''}`);
            console.log(result.ok ? `OK ${file}` : `FAILED ${file}`);
            return result.ok ? 0 : 1;
        }
        case 'query': {
            const graph = loadGraph(flags);
            const matches = queryGraph(indexGraph(graph), {
                type: flags.get('type') as never, status: flags.get('status') as never,
                text: flags.get('text'), seam: flags.get('seam'),
                journey: flags.get('journey'), source: flags.get('source'),
            });
            for (const { id, type, status, name } of matches) console.log(`${type.padEnd(10)} ${status.padEnd(9)} ${id.padEnd(32)} ${name}`);
            console.log(`${matches.length} match(es)`);
            return 0;
        }
        case 'analyze': {
            const graph = loadGraph(flags);
            const journeys = getAllJourneys();
            const journeyIds = new Set(journeys.map(({ id }) => id));
            const findings = [...analyzeGraph(graph, { journeyIds }), ...journeyTargetDrift(journeys, uiTestIds())];
            const highFindings = findings.filter(f => f.severity === 'high');
            for (const { severity, issue, evidence, impact, suggestedChange } of findings)
                console.log(`[${severity}] ${issue}\n  evidence: ${evidence.join(', ')}\n  impact: ${impact}\n  change: ${suggestedChange}`);
            console.log(`${findings.length} finding(s)${highFindings.length ? ` (${highFindings.length} high)` : ''}`);
            return flags.has('strict') && highFindings.length > 0 ? 1 : 0;
        }
        case 'to-journey': {
            const flowId = positionals[0];
            if (!flowId) { console.error('to-journey requires a flowId'); return 1; }
            const spec = compileFlow(flowId, flags);
            if (flags.has('emit-test')) console.log(`Emitted ${emitTest(spec, flags)}`);
            const json = JSON.stringify(spec, null, 2);
            const out = flags.get('out');
            out ? writeFileSync(resolve(ROOT, out), json + '\n') : console.log(json);
            if (out) console.log(`Wrote ${out} (${spec.steps.length} steps, ${spec.status})`);
            return 0;
        }
        case 'run': {
            const flowId = positionals[0];
            if (!flowId) { console.error('run requires a flowId'); return 1; }
            const graph = loadGraph(flags);
            const flow = graph.nodes.find(node => node.id === flowId);
            const registeredId = !flags.has('skeleton') && flow?.type === 'flow' && flow.journey
                && (!!getJourney(flow.journey) || existsSync(journeyTestFile(flow.journey)))
                ? flow.journey
                : undefined;
            const registered = registeredId ? getJourney(registeredId) : undefined;
            const preview = !registered && (flags.has('skeleton') || flow?.type === 'flow')
                ? ensureSkeletonJourney(flowId, graph)
                : undefined;
            if (registeredId) console.log(`Journey test ${registeredId}${registered ? ` (${registered.status})` : ''}`);
            const spec = registeredId ? undefined : preview ?? compileFlow(flowId, flags);
            if (spec && !preview) {
                const file = resolve(ROOT, 'ui/test/optimize', `${spec.id}.journey.ts`);
                if (!existsSync(file)) console.log(`Emitted ${emitTest(spec, flags)}`);
            }
            const id = registeredId ?? spec!.id;
            if (!flags.has('no-build')) {
                const status = buildOptimize();
                if (status !== 0) return status;
            }
            const runId = createRunId();
            console.log(`Running ${id} — run ${runId}`);
            const { status } = runOptimizeTest({ runId, grep: grepFor(id), env: dimensionEnv(flags) });
            console.log(status === 0 ? `PASSED ${id}` : `FAILED ${id}`);

            // Record run
            const bundlePath = join(getEvidenceDirSync(), runId, 'bundle.json');
            appendRunRecord({
                flowId,
                runId,
                bundlePath,
                status: status === 0 ? 'passed' : 'failed',
                timestamp: new Date().toISOString(),
                dimensions: {
                    viewport: flags.get('viewport'),
                    theme: flags.get('theme'),
                    profile: flags.get('profile'),
                    context: flags.get('context'),
                },
            });

            return status ?? 1;
        }
        case 'skeleton': {
            const graph = loadGraph(flags);
            const skeleton = buildSkeleton(graph, { flowIds: flags.get('flows')?.split(',') });
            console.log(`Skeleton: ${skeleton.flows.length} flow(s), ${skeleton.flows.reduce((n, f) => n + f.steps.length, 0)} step(s), ${skeleton.flows.reduce((n, f) => n + f.guards.length, 0)} guard(s), ${skeleton.flows.reduce((n, f) => n + f.effects.length, 0)} effect(s)`);
            for (const flow of skeleton.flows) {
                console.log(`  ${flow.id}: ${flow.steps.length} steps, ${flow.guards.length} guards, ${flow.effects.length} effects`);
            }
            if (flags.has('json')) { console.log(JSON.stringify(skeleton, null, 2)); return 0; }
            const outputs = skeletonOutputs(skeleton);
            if (flags.has('check')) {
                const stale = outputs.filter(({ path, content }) => {
                    const file = resolve(ROOT, path);
                    return !existsSync(file) || readFileSync(file, 'utf8') !== content;
                });
                for (const { path } of stale) console.log(`  STALE ${path}`);
                console.log(stale.length ? `Skeleton artifacts stale (${stale.length})` : 'Skeleton artifacts current');
                return stale.length ? 1 : 0;
            }
            if (flags.has('write')) {
                const { files } = writeSkeletonOutputs(flags);
                for (const file of files) console.log(`Wrote ${file}`);
                return 0;
            }
            return 0;
        }
        case 'generate': {
            if (flags.has('check')) {
                const stale = skeletonOutputs(buildSkeleton(loadGraph(flags)))
                    .filter(({ path, content }) => {
                        const file = resolve(ROOT, path);
                        return !existsSync(file) || readFileSync(file, 'utf8') !== content;
                    });
                console.log(stale.length ? `${stale.length} stale generated artifact(s)` : 'Generated artifacts current');
                return stale.length ? 1 : 0;
            }
            const { files, manifests } = generateAll(flags);
            console.log(`Generated ${files} preview artifact(s) and ${manifests} manifest(s)`);
            return 0;
        }
        case 'simulate': {
            const flowId = positionals[0];
            if (!flowId) { console.error('simulate requires a flowId'); return 1; }
            const simulation = simulateFlow(loadGraph(flags), flowId, flags.get('conditions')?.split(',') ?? []);
            console.log(`Simulate ${flowId}: ${simulation.status}${simulation.reason ? ` (${simulation.reason})` : ''}`);
            for (const step of simulation.steps) {
                const guards = step.guards.map(({ id, satisfied }) => `${id}:${satisfied ? 'satisfied' : 'blocked'}`).join(' ');
                const effects = step.effects.map(({ id, risk, confirmationRequired }) => `${id}:${risk}${confirmationRequired ? '+confirm' : ''}`).join(' ');
                console.log(`  ${step.kind.padEnd(8)} ${step.id}${guards ? `  guards ${guards}` : ''}${effects ? `  effects ${effects}` : ''}`);
            }
            if (flags.has('json')) console.log(JSON.stringify(simulation, null, 2));
            return simulation.status === 'missing' ? 1 : 0;
        }
        case 'matrix': {
            const graph = loadGraph(flags);
            const skeleton = buildSkeleton(graph);
            const previewFlows = skeletonJourneyFlows(skeleton).map(({ id }) => id);
            const implemented = graph.nodes
                .filter(node => node.type === 'flow' && ['implemented', 'partial'].includes(node.status))
                .map(node => node.id);
            const flows = flags.get('flows')?.split(',') ?? [...new Set([...implemented, ...previewFlows])];
            const viewports = flags.get('viewports')?.split(',') ?? ['desktop-1440', 'mobile-390'];
            const themes = flags.get('themes')?.split(',') ?? ['dark', 'light'];
            const profiles = flags.get('profiles')?.split(',');

            if (!flags.has('no-build')) {
                const status = buildOptimize();
                if (status !== 0) return status;
            }

            const results: Array<{ flowId: string; viewport: string; theme: string; status: number | null; runId: string }> = [];
            for (const flowId of flows) {
                const flow = graph.nodes.find(node => node.id === flowId);
                const handId = flow?.type === 'flow' && flow.journey
                    && (!!getJourney(flow.journey) || existsSync(journeyTestFile(flow.journey)))
                    ? flow.journey
                    : undefined;
                const variants: Array<{ id: string; profile: string }> = [];
                if (handId) variants.push({ id: handId, profile: 'hand-built' });
                if (previewFlows.includes(flowId)) {
                    const preview = ensureSkeletonJourney(flowId, graph);
                    if (preview) variants.push({ id: preview.id, profile: 'generated' });
                }
                if (!variants.length) { console.log(`SKIP ${flowId} (no registered journey)`); continue; }
                for (const variant of variants.filter(v => !profiles || profiles.includes(v.profile))) {
                    for (const viewport of viewports) {
                        for (const theme of themes) {
                            const runId = createRunId();
                            console.log(`Running ${variant.id} ${viewport}/${theme} — ${runId}`);
                            const { status } = runOptimizeTest({
                                runId, grep: grepFor(variant.id),
                                env: { ...dimensionEnv(flags), NOTENTION_VIEWPORT: viewport, NOTENTION_THEME: theme },
                            });
                            appendRunRecord({
                                flowId,
                                runId,
                                bundlePath: join(getEvidenceDirSync(), runId, 'bundle.json'),
                                status: status === 0 ? 'passed' : 'failed',
                                timestamp: new Date().toISOString(),
                                dimensions: { viewport, theme, profile: variant.profile },
                            });
                            results.push({ flowId, viewport, theme, status, runId });
                        }
                    }
                }
            }
            const failed = results.filter(({ status }) => status !== 0);
            console.log(`Matrix: ${results.length - failed.length}/${results.length} passed (${new Set(flows).size} flows x ${viewports.length} viewports x ${themes.length} themes)`);
            for (const { flowId, viewport, theme, runId } of failed) console.log(`  FAILED ${flowId} ${viewport}/${theme} ${runId}`);
            return failed.length ? 1 : 0;
        }
        case 'compare': {
            const [pathA, pathB] = positionals;
            if (!pathA || !pathB) { console.error('compare requires two bundle paths'); return 1; }
            const load = (path: string): EvidenceBundle => {
                const file = resolve(ROOT, path);
                return JSON.parse(readFileSync(file.endsWith('.json') ? file : join(file, 'bundle.json'), 'utf8'));
            };
            const comparison = compareBundles(load(pathA), load(pathB));
            for (const side of [comparison.a, comparison.b])
                console.log(`${side.journeyId} (${side.runId}): ${side.status}, ${side.steps} steps, ${side.durationMs}ms, failed: ${side.failedAssertions.join(', ') || 'none'}`);
            console.log(`delta(b-a): ${comparison.durationDeltaMs}ms${comparison.kindMismatch ? ' — step kinds differ, not directly comparable' : ''}`);
            for (const { index, kindA, kindB, deltaMs } of comparison.stepDeltas)
                console.log(`  ${index}: ${kindA ?? '-'} -> ${kindB ?? '-'} ${deltaMs >= 0 ? '+' : ''}${deltaMs}ms`);
            return 0;
        }
        case 'scan': {
            const result = scanAll();
            const json = JSON.stringify(result, null, 2);
            const out = flags.get('out');
            out ? writeFileSync(resolve(ROOT, out), json + '\n') : console.log(json);
            if (out) console.log(`Wrote scan results to ${out}`);
            console.log(`surfaces: ${result.surfaces.length}, navigation: ${result.navigation.length}, seams: ${result.seams.length}, journeys: ${result.journeys.length}, strategies: ${result.strategies.length}, components: ${result.components.length}, taxonomy: ${result.taxonomy.length}, goldenCases: ${result.goldenCases.length}, loopRuns: ${result.loopRuns.length}`);
            return 0;
        }
        case 'sync': {
            const graph = loadGraph(flags);
            const apply = flags.has('apply');
            const result = syncGraphWithCode(graph, apply);
            console.log(`Graph vs Code Sync Report`);
            console.log(`========================`);
            console.log(`Surfaces:  graph=${result.stats.graphSurfaces} scan=${result.stats.scanSurfaces}`);
            console.log(`Navigation: graph=${result.stats.graphNavigation} scan=${result.stats.scanNavigation}`);
            console.log(`Seams:     graph=${result.stats.graphSeams} scan=${result.stats.scanSeams}`);
            console.log(`Journeys:  graph=${result.stats.graphJourneys} scan=${result.stats.scanJourneys}`);
            console.log(`Strategies: graph=${result.stats.graphStrategies} scan=${result.stats.scanStrategies}`);
            console.log();
            console.log(`Proposals: ${result.proposals.length}`);
            for (const p of result.proposals) {
                console.log(`  [${p.severity.toUpperCase()}] ${p.type}: ${p.description}`);
                console.log(`    Fix: ${p.suggestedChange}`);
            }
            if (apply) {
                console.log('\n--apply not yet implemented; proposals shown above');
            }
            return result.proposals.some(p => p.severity === 'error') ? 1 : 0;
        }
        case 'inventory': {
            const graph = loadGraph(flags);
            const count = (key: 'type' | 'status') => {
                const totals = new Map<string, number>();
                for (const node of graph.nodes) totals.set(node[key], (totals.get(node[key]) ?? 0) + 1);
                return [...totals].map(([k, n]) => `${k}:${n}`).join(' ');
            };
            console.log(`nodes ${graph.nodes.length} (${count('type')})\nedges ${graph.edges.length}\nstatus ${count('status')}`);
            const journeys = getAllJourneys();
            const linked = new Set(graph.nodes.flatMap(node => node.type === 'flow' && node.journey ? [node.journey] : []));
            console.log(`journeys registered: ${journeys.length}, linked: ${linked.size}`);
            for (const { id, status, intent } of journeys) console.log(`  ${linked.has(id) ? 'x' : ' '} ${id} (${status}) — ${intent}`);
            const seams = new Set(graph.nodes.flatMap(node => 'seam' in node && node.seam ? [node.seam] : []));
            console.log(`seams covered: ${[...seams].join(', ') || 'none'}; available: ${Object.values(SEAM_ROLES).join(', ')}`);
            const variants = graph.nodes.filter(({ status }) => status === 'planned' || status === 'candidate');
            for (const { id, status, name } of variants) console.log(`variant ${status}: ${id} — ${name}`);

            // Show top 3 priority items
            const priority = loadPriority();
            if (priority?.items.length) {
                console.log('\nTop priority:');
                for (const item of priority.items.slice(0, 3)) {
                    console.log(`  ${item.nodeId} (${item.type}) score=${item.score} [${item.reasons.join(', ')}]`);
                }
            }
            return 0;
        }
        case 'metrics': {
            const days = parseInt(flags.get('days') ?? '7', 10);
            const metrics = collectMetrics(days);
            console.log(`Metrics collected (last ${days} days):`);
            console.log(`  friction entries: ${metrics.friction.length}`);
            console.log(`  loop latency runs: ${metrics.loopLatency.length}`);
            console.log(`  probe entries: ${metrics.probe.length}`);
            console.log(`  eval:match entries: ${metrics.evalMatch.length}`);
            console.log(`  ux-evaluate entries: ${metrics.uxEvaluate.length}`);
            console.log(`  drift findings: ${metrics.driftFindings.length}`);
            console.log(`  failing assertions: ${metrics.failingAssertions.length}`);
            console.log(`Written to doc/uisg/metrics.json`);
            return 0;
        }
        case 'rank': {
            const profile = (flags.get('profile') as any) ?? 'default';
            const priority = rankItems(profile);
            console.log(`Ranked ${priority.items.length} items (profile: ${profile}):`);
            for (const item of priority.items.slice(0, 10)) {
                console.log(`  ${item.score.toFixed(2)} ${item.nodeId} (${item.type}) impact=${item.impact} conf=${item.confidence} effort=${item.effort} [${item.reasons.join(', ')}]`);
            }
            console.log(`Written to doc/uisg/priority.json`);
            return 0;
        }
        case 'select': {
            const feature = positionals[0];
            if (!feature) { console.error('select requires a feature query'); return 1; }
            const request = {
                feature,
                context: flags.get('context'),
                profile: flags.get('profile'),
                modality: flags.get('modality'),
                theme: flags.get('theme'),
                viewport: flags.get('viewport'),
                connectivity: flags.get('connectivity'),
                locale: flags.get('locale'),
                expertise: flags.get('expertise'),
            };
            const result = selectFeature(request);
            console.log(`Selection for "${feature}":`);
            console.log(`  Selected: ${result.selected.join(', ') || 'none'}`);
            console.log(`  Satisfied: ${result.satisfied}`);
            console.log(`  Explanation: ${result.explanation}`);
            if (result.conflicts.length > 0) {
                console.log(`  Conflicts:`);
                for (const c of result.conflicts) {
                    console.log(`    [${c.type}] ${c.message} (nodes: ${c.nodes.join(', ')})`);
                }
            }
            console.log(`Written to doc/uisg/selection.json`);
            return result.satisfied ? 0 : 1;
        }
        case 'contexts': {
            if (flags.has('list')) {
                const profiles = listProfiles();
                console.log(`Context profiles:`);
                for (const p of profiles) {
                    console.log(`  ${p.id}: ${p.name} (${p.expertise}, ${p.device}, ${p.connectivity}, ${p.locale})`);
                    console.log(`    viewport=${p.dimensions.viewport} theme=${p.dimensions.theme} modality=${p.dimensions.modality} profile=${p.dimensions.profile}`);
                    console.log(`    a11y: ${p.a11yConstraints.join(', ') || 'none'}`);
                }
                return 0;
            }
            // Ensure file exists
            ensureContextsFile();
            console.log(`Contexts file ensured at doc/uisg/contexts.json`);
            return 0;
        }
        case 'adopt': {
            const flowId = positionals[0];
            if (!flowId) { console.error('adopt requires a flowId'); return 1; }
            const baselineRunId = flags.get('baseline');
            const variantRunId = flags.get('variant');
            const hypothesis = flags.get('hypothesis');
            const metric = flags.get('metric');
            const actor = flags.get('actor');
            if (!baselineRunId || !variantRunId || !hypothesis || !metric || !actor) {
                console.error('adopt requires --baseline, --variant, --hypothesis, --metric, --actor');
                return 1;
            }
            const result = adoptFlow({
                flowId,
                baselineRunId,
                variantRunId,
                hypothesis,
                metric,
                expectedEffect: flags.get('expected') ?? '',
                actor,
                evidence: {
                    source: 'test-derived',
                    refs: [baselineRunId, variantRunId],
                    date: new Date().toISOString(),
                    confidence: 'high',
                },
            });
            console.log(`Adopt ${flowId}: ${result.decision.toUpperCase()}`);
            console.log(`  Graph updated: ${result.graphUpdated}`);
            console.log(`  Comparison: delta=${result.comparison.durationDeltaMs}ms kindMismatch=${result.comparison.kindMismatch}`);
            if (result.error) console.log(`  Error: ${result.error}`);
            return result.success && result.decision === 'adopt' ? 0 : 1;
        }
        case 'canonicalize': {
            const graph = loadGraph(flags);
            const canon = canonicalize(graph);
            const hash = graphHash(canon);
            console.log(`Canonical hash: ${hash}`);
            if (flags.has('check-roundtrip')) {
                const ok = roundTripTest(graph);
                console.log(`Round-trip test: ${ok ? 'PASS' : 'FAIL'}`);
                return ok ? 0 : 1;
            }
            const out = flags.get('out');
            if (out) {
                writeFileSync(resolve(ROOT, out), JSON.stringify(canon, null, 2) + '\n');
                console.log(`Written to ${out}`);
            } else {
                console.log(JSON.stringify(canon, null, 2));
            }
            return 0;
        }
        case 'check': {
            const graph = loadGraph(flags);
            const journeyIds = new Set(getAllJourneys().map(({ id }) => id));
            const findings = analyzeGraph(graph, { journeyIds });
            const sync = syncGraphWithCode(graph);
            const regressions = runSeededRegressions(graph, loadRegressionCatalogue(), journeyIds);
            const roundtrip = roundTripTest(graph);
            const staleSkeleton = skeletonOutputs(buildSkeleton(graph)).filter(({ path, content }) => {
                const file = resolve(ROOT, path);
                return !existsSync(file) || readFileSync(file, 'utf8') !== content;
            }).map(({ path }) => path);
            const blocked = sync.proposals.filter(({ severity }) => severity !== 'info');
            const missed = regressions.filter(({ detected }) => !detected);
            const evidenceDir = getEvidenceDirSync();
            const unresolved = loadRuns().filter(
                run => !existsSync(resolve(ROOT, run.bundlePath)) && !existsSync(join(evidenceDir, run.runId, 'bundle.json'))
            );
            console.log(`  findings: ${findings.length}`);
            console.log(`  sync warnings: ${blocked.length}`);
            console.log(`  seeded regressions: ${regressions.length - missed.length}/${regressions.length}`);
            console.log(`  unresolved run records: ${unresolved.length}`);
            console.log(`  skeleton artifacts: ${staleSkeleton.length ? `${staleSkeleton.length} stale` : 'current'}`);
            console.log(`  round-trip: ${roundtrip ? 'PASS' : 'FAIL'}`);
            const failed = findings.length > 0 || blocked.length > 0 || missed.length > 0 || unresolved.length > 0 || staleSkeleton.length > 0 || !roundtrip;
            console.log(failed ? 'CHECK FAILED' : 'CHECK OK');
            return failed ? 1 : 0;
        }
        case 'regressions': {
            const graph = loadGraph(flags);
            const catalogue = loadRegressionCatalogue();
            const outcomes = runSeededRegressions(graph, catalogue, new Set(getAllJourneys().map(({ id }) => id)));
            for (const outcome of outcomes) {
                console.log(`  [${outcome.detected ? 'OK' : 'MISS'}] ${outcome.seedId} (${outcome.family}) -> ${outcome.expectedCode}`);
            }
            const missed = outcomes.filter(outcome => !outcome.detected);
            console.log(`Seeded regressions: ${outcomes.length - missed.length}/${outcomes.length} detected`);
            return missed.length ? 1 : 0;
        }
        case 'diff': {
            const [baseline, variant] = positionals;
            if (!baseline || !variant) { console.error('diff requires baseline and variant'); return 1; }
            const result = diffGraphsCommand({ baseline, variant, semanticOnly: flags.has('semantic') });
            printDiff(result);
            return result.semanticChanges.length > 0 ? 1 : 0;
        }
        case 'findings': {
            const markFixed = flags.get('mark-fixed');
            const by = flags.get('by');
            const run = flags.get('run');
            const verify = flags.get('verify');
            if (markFixed) {
                if (!by || !run) { console.error('--mark-fixed requires --by and --run'); return 1; }
                const finding = markFindingFixed(markFixed, by, run);
                if (finding) console.log(`Marked ${markFixed} as fixed`);
                else console.error(`Finding ${markFixed} not found`);
                return finding ? 0 : 1;
            }
            if (verify) {
                if (!run) { console.error('--verify requires --run'); return 1; }
                const finding = verifyFinding(verify, run);
                if (finding) console.log(`Verified ${verify}`);
                else console.error(`Finding ${verify} not found`);
                return finding ? 0 : 1;
            }
            const findings = loadFindings();
            console.log(`Findings (${findings.length}):`);
            for (const f of findings) {
                console.log(`  [${f.severity}] ${f.id} ${f.issue} (${f.status})`);
            }
            return 0;
        }
        case 'runs': {
            const runs = loadRuns();
            if (flags.has('repair')) {
                const evidenceDir = getEvidenceDirSync();
                let repaired = 0;
                const resolved = [];
                const unresolved = [];
                for (const run of runs) {
                    if (existsSync(resolve(ROOT, run.bundlePath))) { resolved.push(run); continue; }
                    const candidate = join(evidenceDir, run.runId, 'bundle.json');
                    if (existsSync(candidate)) {
                        repaired += 1;
                        resolved.push({ ...run, bundlePath: candidate });
                    } else {
                        unresolved.push(run);
                    }
                }
                const unresolvedFile = resolve(ROOT, 'doc/uisg/runs.unresolved.jsonl');
                const previous = existsSync(unresolvedFile)
                    ? readFileSync(unresolvedFile, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
                    : [];
                const quarantined = [...new Map([...previous, ...unresolved].map((run: { runId: string }) => [run.runId, run])).values()];
                writeFileSync(resolve(ROOT, 'doc/uisg/runs.jsonl'), resolved.map(run => JSON.stringify(run)).join('\n') + '\n');
                writeFileSync(unresolvedFile, quarantined.map(run => JSON.stringify(run)).join('\n') + '\n');
                console.log(`Repaired ${repaired}/${runs.length} run bundle paths; quarantined ${unresolved.length}`);
                return 0;
            }
            console.log(`Recent runs (${runs.length}):`);
            for (const r of runs.slice(-10).reverse()) {
                console.log(`  ${r.runId} ${r.flowId} ${r.status} ${r.timestamp}`);
            }
            return 0;
        }
        default:
            console.error(`Unknown command: ${command}\n${USAGE}`);
            return 1;
    }
}

process.exitCode = main();