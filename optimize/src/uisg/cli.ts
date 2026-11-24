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
import { createRunId, runOptimizeTest, runOptimizeTestAsync } from '../runner.js';
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
import { flowToReducer, emitReducer } from './flowToReducer.js';
import { emitSeamProps, writeSeamProps } from './seamProps.js';
import { emitComponentMap, writeComponentMap } from './componentMap.js';
import { generateSurface, generateAllSurfaces, checkParity, checkAllParity } from './codegen.js';
import { buildMatrixCells, runMatrix, writeMatrixReport, type MatrixConfig, type MatrixJourney } from './matrix.js';
import type { SurfaceVariantStatus, UisgGraph, UisgSurface } from './types.js';
import type { TemplateTarget } from './templates/render.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const USAGE = `Usage: pnpm uisg <command> [args]

Commands:
  validate [--graph <file>]                 Schema + reference + reachability checks
  query [--type t] [--status s] [--text q] [--seam s] [--journey id] [--source path]
  analyze [--graph <file>] [--strict]       Actionable findings (issue/evidence/impact/change)
  to-journey <flowId> [--seed <file>] [--out <file>] [--conditions a,b] [--ready] [--emit-test [--force]]
  run <flowId> [same flags as to-journey]   Compile, emit the journey test if missing, run it
  skeleton [--write] [--check] [--json]      Emit the generated skeleton preview + preview journeys
  generate --target=<react|html|json> [--surface <id>] [--all] [--dry-run] [--changed]
                                            Generate surface component + test + props schema (target required)
  generate [--check] [--parity]             Verify generated React artifacts (no target)
  optimize [--changed] [--dry-run] [--json] [--context <id>]  Run full pipeline: types, scan, generate, check
  simulate <flowId> [--conditions a,b]        Walk the graph; report guards, effects, and blocked branches
  reducer <flowId> [--out <file>]           Generate flow reducer from graph
  matrix [--journeys a,b|all] [--contexts c|all] [--themes t|all] [--viewports v|all]
         [--profiles hand-built,generated] [--parallelism N] [--plan] [--no-build]
                                            Run journeys across contexts x themes x viewports; write matrix report
  compare <bundleA> <bundleB>               Diff two evidence bundles (run dirs or bundle.json files)
  inventory                                 Graph stats, journey links, seam coverage, variants
  scan [--out <file>]                       Scan codebase for surfaces, navigation, seams, journeys, strategies
  sync [--graph <file>] [--apply]           Compare graph with code; propose repairs (dry-run by default)
  metrics [--days N]                        Ingest friction, latency, probe, eval, drift -> doc/uisg/metrics.json
  rank [--profile <name>]                   Score nodes by (impact*confidence)/effort -> doc/uisg/priority.json
  select <feature> [--context <id>] [--modality <m>] [--theme <t>] [--viewport <v>] [--profile <p>]
                                            Check constraints, return selection + conflicts -> doc/uisg/selection.json
  contexts [--list]                         Manage context profiles (doc/uisg/contexts.json)
  themes <list|show|generate|check> [id]    Manage token themes (doc/uisg/themes.json)
  variants <list|create|promote|archive|diff|export>  Variant registry CRUD (doc/uisg/variants.json)
  adopt <flowId> --baseline <runId> --variant <runId> --hypothesis <text> --metric <name> --actor <name>
                                            Compare bundles, update lifecycle, record decision
  canonicalize [--graph <file>] [--check-roundtrip]  Canonicalize graph; verify round-trip
  regressions [--graph <file>]              Apply seeded regressions; every expected finding must fire
  check [--graph <file>]                    Gate: validate, analyze --strict, sync, regressions, round-trip, types
  diff <baseline> <variant> [--semantic]    Semantic diff of two graphs (files, 'current', or 'hash:<id>')
  findings [--mark-fixed <id> --by <name> --run <runId>] [--verify <id> --run <runId>]  Findings repo
  runs [--repair]                            Show recent run records; resolve bundle paths in place
  types [--check]                            Generate seamProps.ts and componentMap.ts (or verify they match)
  seam-props [--check]                       Generate or verify ui/src/strategies/seamProps.ts
  component-map [--check]                    Generate or verify ui/src/strategies/componentMap.ts

Default graph: doc/uisg/graph.json`;

function parseArgs(argv: string[]) {
    const flags = new Map<string, string>();
    const positionals: string[] = [];
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith('--')) { positionals.push(argv[i]); continue; }
        const raw = argv[i].slice(2);
        const equals = raw.indexOf('=');
        if (equals >= 0) { flags.set(raw.slice(0, equals), raw.slice(equals + 1)); continue; }
        const next = argv[i + 1];
        flags.set(raw, next && !next.startsWith('--') ? argv[++i] : 'true');
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

export function saveGraph(graph: UisgGraph, file?: string): void {
    const targetFile = resolve(ROOT, file ?? 'doc/uisg/graph.json');
    writeFileSync(targetFile, JSON.stringify(graph, null, 2) + '\n');
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

async function main(): Promise<number> {
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
            if (flags.has('parity')) {
                const graph = loadGraph(flags);
                const surfaceId = flags.get('surface');
                const all = flags.has('all');
                const results = surfaceId 
                    ? [checkParity(graph.nodes.find(n => n.id === surfaceId && n.type === 'surface') as any, graph)]
                    : all
                        ? checkAllParity(graph)
                        : checkAllParity(graph);
                
                let failed = false;
                for (const r of results) {
                    console.log(`\n=== Parity Check: ${r.surfaceId} ===`);
                    console.log(`  Deterministic: ${r.deterministic ? 'YES' : 'NO'}`);
                    console.log(`  Has Original: ${r.hasOriginal ? 'YES' : 'NO'}`);
                    if (r.hasOriginal) {
                        console.log(`  Original Matches: ${r.originalMatches ? 'YES' : 'NO'}`);
                    }
                    if (r.differences.length > 0) {
                        console.log(`  Differences:`);
                        for (const d of r.differences) {
                            console.log(`    - ${d}`);
                        }
                    }
                    if (!r.deterministic) failed = true;
                }
                console.log(`\n${failed ? 'PARITY CHECK FAILED' : 'PARITY CHECK PASSED'}`);
                return failed ? 1 : 0;
            }
            const graph = loadGraph(flags);
            const surfaceId = flags.get('surface');
            const all = flags.has('all');
            const dryRun = flags.has('dry-run');
            const changed = flags.has('changed');
            const target = flags.get('target') as TemplateTarget | undefined;
            const variant = flags.get('variant');
            if (!target) {
                console.error('generate --surface/--all requires --target=react|html|json');
                return 1;
            }
            
            if (surfaceId) {
                const surface = graph.nodes.find(n => n.id === surfaceId && n.type === 'surface') as UisgSurface | undefined;
                if (!surface) {
                    console.error(`Surface ${surfaceId} not found`);
                    return 1;
                }
                if (surface.seam) {
                    console.error(`Surface ${surfaceId} has seam="${surface.seam}" - skipping (strategy-backed)`);
                    return 1;
                }
                if (variant && !surface.variants?.[variant]) {
                    console.error(`Surface ${surfaceId} does not have variant "${variant}"`);
                    return 1;
                }
                if (dryRun) {
                    const result = generateSurface(surface as any, graph, { target, dryRun: true, variant });
                    console.log(`DRY RUN - Would generate:`);
                    console.log(`  Component: ${result.path}`);
                    console.log(`  Test: ${result.testPath}`);
                    console.log(`  PropsSchema: ${result.propsSchemaPath}`);
                    if (variant) console.log(`  Variant: ${variant}`);
                    console.log(`\n--- Component preview (first 100 lines) ---`);
                    console.log(result.content.split('\n').slice(0, 100).join('\n'));
                    return 0;
                }
                const result = generateSurface(surface as any, graph, { target, variant });
                console.log(`Generated ${result.path}${variant ? ` (variant: ${variant})` : ''}`);
                console.log(`Generated ${result.testPath}`);
                console.log(`Generated ${result.propsSchemaPath}`);
                return 0;
            }
            
            if (all) {
                let targets = graph.nodes.filter(n => n.type === 'surface' && !n.seam && 
                    (n.status === 'implemented' || n.status === 'partial' || n.status === 'planned')) as any[];
                
                if (changed) {
                    const { checkAllParity } = await import('./codegen.js');
                    const parityResults = checkAllParity(graph, undefined, variant);
                    const changedSurfaceIds = parityResults
                        .filter(r => !r.deterministic)
                        .map(r => r.surfaceId);
                    targets = targets.filter(s => changedSurfaceIds.includes(s.id));
                    console.log(`Changed surfaces: ${changedSurfaceIds.join(', ') || 'none'}`);
                }
                
                const results = [];
                for (const surface of targets) {
                    if (variant && !surface.variants?.[variant]) continue;
                    try {
                        const result = dryRun
                            ? generateSurface(surface, graph, { target, dryRun: true, variant })
                            : generateSurface(surface, graph, { target, variant });
                        results.push(result);
                    } catch (e) {
                        console.error(`Failed to generate ${surface.id}: ${e}`);
                    }
                }
                console.log(`Generated ${results.length} surface(s)${variant ? ` (variant: ${variant})` : ''}`);
                for (const r of results) {
                    console.log(`  ${r.path}`);
                    console.log(`  ${r.testPath}`);
                    console.log(`  ${r.propsSchemaPath}`);
                }
                return 0;
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
        case 'reducer': {
            const flowId = positionals[0];
            if (!flowId) { console.error('reducer requires a flowId'); return 1; }
            const graph = loadGraph(flags);
            const out = flags.get('out') ?? `ui/src/hooks/reducers/${flowId}.ts`;
            const reducer = flowToReducer(graph, flowId);
            const content = emitReducer(reducer);
            const { writeFileSync, mkdirSync } = await import('node:fs');
            const { dirname } = await import('node:path');
            const fullPath = resolve(ROOT, out);
            mkdirSync(dirname(fullPath), { recursive: true });
            writeFileSync(fullPath, content);
            console.log(`Generated ${out}`);
            if (flags.has('json')) console.log(JSON.stringify(reducer, null, 2));
            return 0;
        }
        case 'matrix': {
            const graph = loadGraph(flags);
            const skeleton = buildSkeleton(graph);
            const previewFlows = skeletonJourneyFlows(skeleton).map(({ id }) => id);
            const implemented = graph.nodes
                .filter(node => node.type === 'flow' && ['implemented', 'partial'].includes(node.status))
                .map(node => node.id);
            const flows = flags.get('flows')?.split(',') ?? flags.get('journeys')?.split(',') ?? [...new Set([...implemented, ...previewFlows])];
            const profiles = flags.get('profiles')?.split(',');
            const { listThemes } = await import('./themes.js');

            const contexts = flags.get('contexts')?.split(',') ?? [];
            const themes = flags.get('themes')?.split(',') ?? ['dark', 'light'];
            const viewports = flags.get('viewports')?.split(',') ?? ['desktop-1440', 'mobile-390'];
            const variants = flags.get('variants')?.split(',') ?? [];

            const config: MatrixConfig = {
                contexts: contexts.includes('all') ? listProfiles().map(({ id }) => id) : contexts,
                themes: themes.includes('all')
                    ? [...new Set([...listThemes().map(({ id }) => id), 'dark', 'light'])]
                    : themes,
                viewports: viewports.includes('all') ? ['desktop-1440', 'tablet-834', 'mobile-390'] : viewports,
                variants: variants.includes('all') ? [] : variants,
                parallelism: Number(flags.get('parallelism') ?? 4),
            };

            const journeys: MatrixJourney[] = [];
            for (const flowId of flows) {
                const flow = graph.nodes.find(node => node.id === flowId);
                const handId = flow?.type === 'flow' && flow.journey
                    && (!!getJourney(flow.journey) || existsSync(journeyTestFile(flow.journey)))
                    ? flow.journey
                    : undefined;
                const journeyVariants: Array<{ id: string; profile: string }> = [];
                if (handId) journeyVariants.push({ id: handId, profile: 'hand-built' });
                if (previewFlows.includes(flowId)) {
                    const preview = ensureSkeletonJourney(flowId, graph);
                    if (preview) journeyVariants.push({ id: preview.id, profile: 'generated' });
                }
                if (!journeyVariants.length) { console.log(`SKIP ${flowId} (no registered journey)`); continue; }
                for (const variant of journeyVariants.filter(v => !profiles || profiles.includes(v.profile))) {
                    journeys.push({ flowId, journey: variant.id, profile: variant.profile });
                }
            }

            if (flags.has('plan')) {
                const cells = buildMatrixCells(config, journeys);
                for (const cell of cells) {
                    console.log(`${cell.journey} [${cell.profile}] ${cell.context ?? '-'} ${cell.theme}/${cell.viewport}${cell.variant ? ` variant=${cell.variant}` : ''}`);
                }
                console.log(`${cells.length} cell(s)`);
                return 0;
            }

            if (!flags.has('no-build')) {
                const status = buildOptimize();
                if (status !== 0) return status;
            }

            const result = await runMatrix(config, journeys, async cell => {
                const runId = createRunId();
                console.log(`Running ${cell.journey} ${cell.context ?? '-'} ${cell.theme}/${cell.viewport}${cell.variant ? ` variant=${cell.variant}` : ''} — ${runId}`);
                const { status } = await runOptimizeTestAsync({
                    runId,
                    grep: grepFor(cell.journey),
                    env: {
                        ...dimensionEnv(flags),
                        NOTENTION_VIEWPORT: cell.viewport,
                        NOTENTION_THEME: cell.theme,
                        ...(cell.context ? { NOTENTION_CONTEXT: cell.context } : {}),
                        ...(cell.variant ? { NOTENTION_UISG_VARIANT: cell.variant } : {}),
                    },
                });
                const bundlePath = join(getEvidenceDirSync(), runId, 'bundle.json');
                appendRunRecord({
                    flowId: cell.flowId,
                    runId,
                    bundlePath,
                    status: status === 0 ? 'passed' : 'failed',
                    timestamp: new Date().toISOString(),
                    dimensions: { viewport: cell.viewport, theme: cell.theme, profile: cell.profile, variant: cell.variant },
                });
                return { status: status === 0 ? 'passed' : 'failed', runId, bundlePath };
            });

            const { jsonPath, htmlPath } = writeMatrixReport(result);
            console.log(`Matrix: ${result.summary.passed}/${result.summary.total} passed (${result.summary.failed} failed, ${result.summary.skipped} skipped, ${result.summary.errors} errors)`);
            for (const cell of result.cells.filter(({ status }) => status !== 'passed')) {
                console.log(`  ${cell.status.toUpperCase()} ${cell.journey} ${cell.context ?? '-'} ${cell.theme}/${cell.viewport}${cell.variant ? ` variant=${cell.variant}` : ''} ${cell.runId}${cell.error ? ` — ${cell.error}` : ''}`);
            }
            console.log(`Report: ${jsonPath}`);
            console.log(`Report: ${htmlPath}`);
            return result.summary.failed + result.summary.errors ? 1 : 0;
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
                    console.log(`    viewport=${p.viewport} density=${p.density} theme=${p.theme} modality=${p.modality} profile=${p.profile}`);
                    console.log(`    a11y: ${p.a11yConstraints.join(', ') || 'none'} flags: ${p.featureFlags.join(', ') || 'none'}`);
                    if (p.extends) console.log(`    extends: ${p.extends}`);
                }
                return 0;
            }
            ensureContextsFile();
            console.log(`Contexts file ensured at doc/uisg/contexts.json`);
            return 0;
        }
        case 'themes': {
            const [action, id] = positionals;
            const { listThemes, getTheme, writeThemeCss, emitThemeCss, themeCssPath } = await import('./themes.js');
            if (!action || action === 'list') {
                for (const theme of listThemes()) {
                    console.log(`${theme.id}: accent=${theme.accent} radius=${theme.radius} font=${theme.font}`);
                }
                return 0;
            }
            if (action === 'check') {
                const stale = listThemes()
                    .filter(theme => theme.id !== 'default')
                    .filter(theme => {
                        const path = themeCssPath(theme.id);
                        return !existsSync(path) || readFileSync(path, 'utf8') !== emitThemeCss(theme.id, theme);
                    });
                for (const theme of stale) console.log(`stale: ${themeCssPath(theme.id)}`);
                console.log(stale.length ? `${stale.length} stale theme file(s)` : 'Theme CSS current');
                return stale.length ? 1 : 0;
            }
            if (!id) { console.error(`themes ${action} requires a theme id`); return 1; }
            if (action === 'show') {
                console.log(JSON.stringify(getTheme(id), null, 2));
                return 0;
            }
            if (action === 'generate') {
                console.log(`Generated ${writeThemeCss(id)}`);
                return 0;
            }
            console.error(`Unknown themes action: ${action}`);
            return 1;
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
        case 'variants': {
            const [action, surfaceId, variantId, otherId] = positionals;
            const { listVariants, createVariant, promoteVariant, archiveVariant, diffVariants, exportVariants } =
                await import('./variants.js');
            switch (action) {
                case 'list': {
                    const variants = listVariants({ surface: flags.get('surface'), status: flags.get('status') as SurfaceVariantStatus | undefined });
                    if (!variants.length) { console.log('No variants'); return 0; }
                    for (const variant of variants) {
                        console.log(`${variant.surface}/${variant.id} [${variant.status}] ${variant.description}`);
                    }
                    return 0;
                }
                case 'create': {
                    if (!surfaceId || !variantId) { console.error('variants create requires <surfaceId> <variantId>'); return 1; }
                    const patch = flags.get('patch') ? JSON.parse(flags.get('patch')!) : {};
                    const record = createVariant(surfaceId, variantId, patch, flags.get('from'));
                    console.log(`Created ${record.surface}/${record.id}`);
                    return 0;
                }
                case 'promote': {
                    if (!surfaceId || !variantId) { console.error('variants promote requires <surfaceId> <variantId>'); return 1; }
                    const metrics = flags.get('metrics') ? JSON.parse(flags.get('metrics')!) : undefined;
                    const record = promoteVariant(surfaceId, variantId, metrics);
                    console.log(`Promoted ${record.surface}/${record.id}`);
                    return 0;
                }
                case 'archive': {
                    if (!surfaceId || !variantId) { console.error('variants archive requires <surfaceId> <variantId>'); return 1; }
                    const record = archiveVariant(surfaceId, variantId);
                    console.log(`Archived ${record.surface}/${record.id}`);
                    return 0;
                }
                case 'diff': {
                    if (!surfaceId || !variantId || !otherId) { console.error('variants diff requires <surfaceId> <variantA> <variantB>'); return 1; }
                    const diff = diffVariants(surfaceId, variantId, otherId);
                    console.log(`Diff ${diff.surface}: ${diff.from} -> ${diff.to}`);
                    for (const change of diff.changes) {
                        console.log(`  ${change.field}: ${JSON.stringify(change.before)} -> ${JSON.stringify(change.after)}`);
                    }
                    return diff.changes.length ? 1 : 0;
                }
                case 'export': {
                    if (!surfaceId) { console.error('variants export requires <surfaceId>'); return 1; }
                    console.log(exportVariants(surfaceId, (flags.get('format') as 'md' | 'json') ?? 'md'));
                    return 0;
                }
                default:
                    console.error(`Unknown variants action: ${action ?? '(none)'}`);
                    return 1;
            }
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
            // Check generated types
            const currentSeamProps = existsSync(resolve(ROOT, 'ui/src/strategies/seamProps.ts'))
                ? readFileSync(resolve(ROOT, 'ui/src/strategies/seamProps.ts'), 'utf8')
                : '';
            const currentComponentMap = existsSync(resolve(ROOT, 'ui/src/strategies/componentMap.ts'))
                ? readFileSync(resolve(ROOT, 'ui/src/strategies/componentMap.ts'), 'utf8')
                : '';
            const expectedSeamProps = emitSeamProps();
            const expectedComponentMap = emitComponentMap();
            const typesOutOfDate = currentSeamProps !== expectedSeamProps || currentComponentMap !== expectedComponentMap;
            // Check generated surfaces
            const staleGenerated = skeletonOutputs(buildSkeleton(graph))
                .filter(({ path, content }) => {
                    const file = resolve(ROOT, path);
                    return !existsSync(file) || readFileSync(file, 'utf8') !== content;
                })
                .map(({ path }) => path);
            const { listThemes, emitThemeCss, themeCssPath } = await import('./themes.js');
            const staleThemes = listThemes()
                .filter(theme => theme.id !== 'default')
                .filter(theme => {
                    const path = themeCssPath(theme.id);
                    return !existsSync(path) || readFileSync(path, 'utf8') !== emitThemeCss(theme.id, theme);
                })
                .map(theme => themeCssPath(theme.id));

            console.log(`  findings: ${findings.length}`);
            console.log(`  sync warnings: ${blocked.length}`);
            console.log(`  seeded regressions: ${regressions.length - missed.length}/${regressions.length}`);
            console.log(`  unresolved run records: ${unresolved.length}`);
            console.log(`  skeleton artifacts: ${staleSkeleton.length ? `${staleSkeleton.length} stale` : 'current'}`);
            console.log(`  generated surfaces: ${staleGenerated.length ? `${staleGenerated.length} stale` : 'current'}`);
            console.log(`  theme css: ${staleThemes.length ? `${staleThemes.length} stale` : 'current'}`);
            console.log(`  round-trip: ${roundtrip ? 'PASS' : 'FAIL'}`);
            console.log(`  types: ${typesOutOfDate ? 'OUT OF DATE' : 'current'}`);
            const failed = findings.length > 0 || blocked.length > 0 || missed.length > 0 || unresolved.length > 0 || staleSkeleton.length > 0 || staleGenerated.length > 0 || staleThemes.length > 0 || !roundtrip || typesOutOfDate;
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
        case 'types': {
            if (flags.has('check')) {
                const currentSeamProps = existsSync(resolve(ROOT, 'ui/src/strategies/seamProps.ts'))
                    ? readFileSync(resolve(ROOT, 'ui/src/strategies/seamProps.ts'), 'utf8')
                    : '';
                const currentComponentMap = existsSync(resolve(ROOT, 'ui/src/strategies/componentMap.ts'))
                    ? readFileSync(resolve(ROOT, 'ui/src/strategies/componentMap.ts'), 'utf8')
                    : '';
                const expectedSeamProps = emitSeamProps();
                const expectedComponentMap = emitComponentMap();
                let failed = false;
                if (currentSeamProps !== expectedSeamProps) {
                    console.error('seamProps.ts is out of date');
                    failed = true;
                }
                if (currentComponentMap !== expectedComponentMap) {
                    console.error('componentMap.ts is out of date');
                    failed = true;
                }
                if (failed) {
                    console.log('Run "pnpm uisg types" to regenerate');
                    return 1;
                }
                console.log('seamProps.ts and componentMap.ts are up to date');
                return 0;
            }
            writeSeamProps();
            writeComponentMap();
            console.log('Generated seamProps.ts and componentMap.ts');
            return 0;
        }
        case 'seam-props': {
            if (flags.has('check')) {
                const current = existsSync(resolve(ROOT, 'ui/src/strategies/seamProps.ts'))
                    ? readFileSync(resolve(ROOT, 'ui/src/strategies/seamProps.ts'), 'utf8')
                    : '';
                const expected = emitSeamProps();
                if (current !== expected) {
                    console.error('seamProps.ts is out of date');
                    return 1;
                }
                console.log('seamProps.ts is up to date');
                return 0;
            }
            writeSeamProps();
            console.log('Generated seamProps.ts');
            return 0;
        }
        case 'component-map': {
            if (flags.has('check')) {
                const current = existsSync(resolve(ROOT, 'ui/src/strategies/componentMap.ts'))
                    ? readFileSync(resolve(ROOT, 'ui/src/strategies/componentMap.ts'), 'utf8')
                    : '';
                const expected = emitComponentMap();
                if (current !== expected) {
                    console.error('componentMap.ts is out of date');
                    return 1;
                }
                console.log('componentMap.ts is up to date');
                return 0;
            }
            writeComponentMap();
            console.log('Generated componentMap.ts');
            return 0;
        }
        case 'optimize': {
            return runOptimizePipeline(flags);
        }
        default:
            console.error(`Unknown command: ${command}\n${USAGE}`);
            return 1;
    }
}

interface StageResult {
    status: 'ok' | 'error';
    durationMs: number;
    error?: string;
    surfaces?: number;
    strategies?: number;
    generated?: number;
    totalTargets?: number;
}

interface PipelineResults {
    timestamp: string;
    stages: Record<string, StageResult>;
    totalDurationMs: number;
    context?: string;
}

async function runOptimizePipeline(flags: Map<string, string>): Promise<number> {
    const dryRun = flags.has('dry-run');
    const changed = flags.has('changed');
    const json = flags.has('json');
    const contextId = flags.get('context');
    
    let contextProfile = null;
    if (contextId) {
        const { getProfile } = await import('./contexts.js');
        contextProfile = getProfile(contextId);
        if (!contextProfile) {
            console.error(`Context profile "${contextId}" not found`);
            return 1;
        }
        console.log(`Using context profile: ${contextProfile.name} (${contextProfile.id})`);
    }
    
    console.log('=== UISG Optimize Pipeline ===');
    const startTime = Date.now();
    
    const results: PipelineResults = {
        timestamp: new Date().toISOString(),
        stages: {},
        totalDurationMs: 0,
        context: contextProfile?.id ?? 'default',
    };
    
    // Stage 1: Types
    console.log('\n[1/4] Generating types (seamProps + componentMap)...');
    const typesStart = Date.now();
    try {
        writeSeamProps();
        writeComponentMap();
        results.stages.types = { status: 'ok', durationMs: Date.now() - typesStart };
        console.log('  ✓ seamProps.ts');
        console.log('  ✓ componentMap.ts');
    } catch (e) {
        results.stages.types = { status: 'error', error: String(e), durationMs: Date.now() - typesStart };
        console.error('  ✗ Types generation failed:', e);
        return 1;
    }
    
    // Stage 2: Scan
    console.log('\n[2/4] Scanning codebase...');
    const scanStart = Date.now();
    try {
        const scanResult = scanAll();
        if (!dryRun) {
            const { writeFileSync } = await import('node:fs');
            writeFileSync(resolve(ROOT, 'doc/uisg/scan.json'), JSON.stringify(scanResult, null, 2));
        }
        results.stages.scan = { 
            status: 'ok', 
            durationMs: Date.now() - scanStart,
            surfaces: scanResult.surfaces.length,
            strategies: scanResult.strategies.length,
        };
        console.log(`  ✓ ${scanResult.surfaces.length} surfaces, ${scanResult.strategies.length} strategies`);
    } catch (e) {
        results.stages.scan = { status: 'error', error: String(e), durationMs: Date.now() - scanStart };
        console.error('  ✗ Scan failed:', e);
        return 1;
    }
    
    // Stage 3: Generate
    console.log('\n[3/4] Generating surfaces...');
    const genStart = Date.now();
    try {
        const graph = loadGraph(flags);
        const surfaces = graph.nodes.filter(n => n.type === 'surface' && !n.seam) as any[];
        
        let targets = surfaces.filter(s => s.status === 'implemented' || s.status === 'partial' || s.status === 'planned');
        
        if (changed) {
            // Only generate surfaces where source has changed since last generation
            const { checkAllParity } = await import('./codegen.js');
            const parityResults = checkAllParity(graph);
            const changedSurfaceIds = parityResults
                .filter(r => !r.deterministic)
                .map(r => r.surfaceId);
            targets = targets.filter(s => changedSurfaceIds.includes(s.id));
            console.log(`  Changed surfaces: ${changedSurfaceIds.join(', ') || 'none'}`);
        }
        
        // Apply context profile filtering
        if (contextProfile) {
            const profileStrategies = new Set<string>();
            // In a real implementation, this would filter by strategy compatibility with the context
            // For now, we just log the context dimensions
            console.log(`  Context: ${contextProfile.viewport} / ${contextProfile.theme} / ${contextProfile.modality} / profile=${contextProfile.profile}`);
            console.log(`  A11y constraints: ${contextProfile.a11yConstraints.join(', ') || 'none'}`);
        }
        
        let generated = 0;
        if (!dryRun) {
            for (const surface of targets) {
                try {
                    generateSurface(surface, graph, { target: 'react' });
                    generated++;
                } catch (e) {
                    console.error(`  ✗ ${surface.id}: ${e}`);
                }
            }
        } else {
            generated = targets.length;
            console.log(`  Would generate ${targets.length} surface(s)`);
        }
        
        results.stages.generate = { 
            status: 'ok', 
            durationMs: Date.now() - genStart,
            generated,
            totalTargets: targets.length,
        };
        console.log(`  ✓ ${generated} surface(s) generated`);
    } catch (e) {
        results.stages.generate = { status: 'error', error: String(e), durationMs: Date.now() - genStart };
        console.error('  ✗ Generation failed:', e);
        return 1;
    }
    
    // Stage 4: Check
    console.log('\n[4/4] Running verification checks...');
    const checkStart = Date.now();
    try {
        const { spawnSync } = await import('node:child_process');
        const checkResult = spawnSync('pnpm', ['uisg:check'], { cwd: ROOT, stdio: 'inherit', encoding: 'utf8' });
        if (checkResult.status !== 0) {
            throw new Error(`uisg:check failed with exit code ${checkResult.status}`);
        }
        results.stages.check = { status: 'ok', durationMs: Date.now() - checkStart };
        console.log('  ✓ uisg:check passed');
    } catch (e) {
        results.stages.check = { status: 'error', error: String(e), durationMs: Date.now() - checkStart };
        console.error('  ✗ Check failed:', e);
        return 1;
    }
    
    const totalDuration = Date.now() - startTime;
    results.totalDurationMs = totalDuration;
    
    if (!dryRun) {
        const { writeFileSync } = await import('node:fs');
        writeFileSync(resolve(ROOT, 'doc/uisg/optimize-summary.json'), JSON.stringify(results, null, 2));
        console.log('\n📄 Summary written to doc/uisg/optimize-summary.json');
    }
    
    if (json) {
        console.log('\n' + JSON.stringify(results, null, 2));
    }
    
    console.log(`\n✅ Pipeline completed in ${totalDuration}ms`);
    return 0;
}

main().then(code => {
    process.exitCode = code;
}).catch(e => {
    console.error(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
});