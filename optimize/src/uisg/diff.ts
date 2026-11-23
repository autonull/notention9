import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGraph } from './cli.js';
import { validateGraph } from './validate.js';
import { canonicalize, diffGraphs, graphHash } from './canonicalize.js';
import type { UisgGraph } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

export interface DiffOptions {
    baseline: string; // file path or 'current' or 'hash:<hash>'
    variant: string; // file path or 'current' or 'hash:<hash>'
    semanticOnly?: boolean;
}

export interface DiffResult {
    baselineHash: string;
    variantHash: string;
    baselineFile: string;
    variantFile: string;
    addedNodes: number;
    removedNodes: number;
    changedNodes: number;
    addedEdges: number;
    removedEdges: number;
    semanticChanges: string[];
    orderingOnly: boolean;
    details: ReturnType<typeof diffGraphs>;
}

function loadGraphFromArg(arg: string): { graph: UisgGraph; source: string; hash: string } {
    if (arg === 'current') {
        const graph = loadGraph(new Map());
        const validation = validateGraph(graph);
        if (!validation.ok || !validation.graph) {
            throw new Error('Current graph validation failed');
        }
        return { graph: validation.graph, source: 'current', hash: graphHash(validation.graph) };
    }
    if (arg.startsWith('hash:')) {
        // Would load from a hash-indexed store; for now, error
        throw new Error('Hash-based loading not yet implemented');
    }
    // File path
    const file = resolve(ROOT, arg);
    const graph = JSON.parse(readFileSync(file, 'utf8'));
    const validation = validateGraph(graph);
    if (!validation.ok || !validation.graph) {
        throw new Error(`Graph ${file} failed validation`);
    }
    return { graph: validation.graph, source: file, hash: graphHash(validation.graph) };
}

export function diffGraphsCommand(options: DiffOptions): DiffResult {
    const baseline = loadGraphFromArg(options.baseline);
    const variant = loadGraphFromArg(options.variant);

    const diff = diffGraphs(baseline.graph, variant.graph);

    const orderingOnly =
        diff.addedNodes.length === 0 &&
        diff.removedNodes.length === 0 &&
        diff.changedNodes.length === 0 &&
        diff.addedEdges.length === 0 &&
        diff.removedEdges.length === 0 &&
        diff.semanticChanges.length === 0;

    return {
        baselineHash: baseline.hash,
        variantHash: variant.hash,
        baselineFile: baseline.source,
        variantFile: variant.source,
        addedNodes: diff.addedNodes.length,
        removedNodes: diff.removedNodes.length,
        changedNodes: diff.changedNodes.length,
        addedEdges: diff.addedEdges.length,
        removedEdges: diff.removedEdges.length,
        semanticChanges: diff.semanticChanges,
        orderingOnly,
        details: diff,
    };
}

export function printDiff(result: DiffResult): void {
    console.log(`Graph Diff`);
    console.log(`==========`);
    console.log(`Baseline: ${result.baselineFile} (${result.baselineHash.slice(0, 12)})`);
    console.log(`Variant:  ${result.variantFile} (${result.variantHash.slice(0, 12)})`);
    console.log();
    console.log(`Nodes:    +${result.addedNodes} -${result.removedNodes} ~${result.changedNodes}`);
    console.log(`Edges:    +${result.addedEdges} -${result.removedEdges}`);
    console.log();
    if (result.semanticChanges.length > 0) {
        console.log(`Semantic changes:`);
        for (const change of result.semanticChanges) {
            console.log(`  - ${change}`);
        }
    } else if (result.orderingOnly) {
        console.log(`No semantic changes (ordering only)`);
    } else {
        console.log(`No changes`);
    }
}