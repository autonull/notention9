#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import type { UisgGraph } from './types.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const USAGE = `Usage: pnpm uisg <command> [args]

Commands:
  validate [--graph <file>]                 Schema + reference + reachability checks
  query [--type t] [--status s] [--text q] [--seam s] [--journey id] [--source path]
  analyze [--graph <file>]                  Actionable findings (issue/evidence/impact/change)
  to-journey <flowId> [--seed <file>] [--out <file>] [--conditions a,b] [--ready] [--emit-test [--force]]
  run <flowId> [same flags as to-journey]   Compile, emit the journey test if missing, run it
  compare <bundleA> <bundleB>               Diff two evidence bundles (run dirs or bundle.json files)
  inventory                                 Graph stats, journey links, seam coverage, variants

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

function loadGraph(flags: Map<string, string>): UisgGraph {
    const file = resolve(ROOT, flags.get('graph') ?? 'doc/uisg/graph.json');
    const result = validateGraph(JSON.parse(readFileSync(file, 'utf8')));
    if (!result.graph) {
        for (const { severity, code, message } of result.issues) console.error(`${severity.toUpperCase()} ${code}: ${message}`);
        throw new Error(`Graph ${file} failed schema validation`);
    }
    return result.graph;
}

function uiTestIds(): Set<string> {
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
    return flowToJourney(graph, flowId, {
        seed,
        conditions: flags.get('conditions')?.split(','),
        status: flags.has('ready') ? 'ready' : 'draft',
    });
}

function emitTest(spec: JourneySpec, flags: Map<string, string>): string {
    const file = resolve(ROOT, 'ui/test/optimize', `${spec.id}.journey.ts`);
    if (existsSync(file) && !flags.has('force')) throw new Error(`${file} exists; pass --force to overwrite`);
    writeFileSync(file, generateTestFile(spec));
    return file;
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
            const flow = loadGraph(flags).nodes.find(node => node.id === flowId);
            const registered = flow?.type === 'flow' && flow.journey ? getJourney(flow.journey) : undefined;
            if (registered) console.log(`Registered journey ${registered.id} (${registered.status})`);
            const spec = registered ? undefined : compileFlow(flowId, flags);
            if (spec) {
                const file = resolve(ROOT, 'ui/test/optimize', `${spec.id}.journey.ts`);
                if (!existsSync(file)) console.log(`Emitted ${emitTest(spec, flags)}`);
            }
            const id = registered?.id ?? spec!.id;
            if (!flags.has('no-build')) {
                console.log('Building @notention/optimize (Playwright resolves dist)...');
                const built = spawnSync('pnpm', ['--filter', '@notention/optimize', 'build'], { cwd: ROOT, stdio: 'inherit' });
                if (built.status !== 0) return built.status ?? 1;
            }
            const runId = createRunId();
            console.log(`Running ${id} — run ${runId}`);
            const { status } = runOptimizeTest({ runId, grep: id });
            console.log(status === 0 ? `PASSED ${id}` : `FAILED ${id}`);
            return status ?? 1;
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
            const variants = graph.nodes.filter(({ status }) => status === 'planned' || status === 'idea');
            for (const { id, status, name } of variants) console.log(`variant ${status}: ${id} — ${name}`);
            return 0;
        }
        default:
            console.error(`Unknown command: ${command}\n${USAGE}`);
            return 1;
    }
}

process.exitCode = main();
