import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UisgGraph, UisgNode } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

export interface ComponentRegistry {
    components: Map<string, { file: string; exports: string[] }>;
    predicates: Map<string, { registryId: string; expression: string; file: string }>;
    effects: Map<string, { registryId: string; reversibility: string; risk: string; confirmationRequired: boolean; file: string }>;
    actions: Map<string, { file: string; type: 'click' | 'fill' | 'press' | 'select' }>;
}

export function buildComponentRegistry(): ComponentRegistry {
    const registry: ComponentRegistry = {
        components: new Map(),
        predicates: new Map(),
        effects: new Map(),
        actions: new Map(),
    };

    // Scan UI components
    scanComponents(resolve(ROOT, 'ui/src'), registry);

    // Scan UISG graph for predicates and effects (not components - those come from source only)
    const graph = loadGraph();
    for (const node of graph.nodes) {
        if (node.type === 'predicate') {
            registry.predicates.set(node.registryId, {
                registryId: node.registryId,
                expression: node.expression,
                file: node.source?.[0] ?? '',
            });
        }
        if (node.type === 'effect') {
            registry.effects.set(node.registryId, {
                registryId: node.registryId,
                reversibility: node.reversibility,
                risk: node.risk,
                confirmationRequired: node.confirmationRequired,
                file: node.source?.[0] ?? '',
            });
        }
    }

    return registry;
}

function scanComponents(dir: string, registry: ComponentRegistry): void {
    if (!statSync(dir).isDirectory()) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            scanComponents(path, registry);
        } else if (/\.tsx?$/.test(entry.name)) {
            const source = readFileSync(path, 'utf8');
            // Extract component exports
            const exportMatches = source.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g);
            for (const match of exportMatches) {
                const name = match[1];
                if (name[0] === name[0].toUpperCase()) {
                    registry.components.set(name, { file: path, exports: [name] });
                }
            }
        }
    }
}

function loadGraph(): UisgGraph {
    const file = resolve(ROOT, 'doc/uisg/graph.json');
    const content = readFileSync(file, 'utf8');
    return JSON.parse(content) as UisgGraph;
}

export function validateAgainstRegistry(
    graph: UisgGraph,
    registry: ComponentRegistry
): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const node of graph.nodes) {
        if (node.type === 'surface' && node.component && (node.status === 'implemented' || node.status === 'partial')) {
            if (!registry.components.has(node.component)) {
                errors.push(`Surface ${node.id} references unknown component ${node.component}`);
            }
        }
        if (node.type === 'step' && node.guard) {
            if (!registry.predicates.has(node.guard)) {
                errors.push(`Step ${node.id} references unknown predicate ${node.guard}`);
            }
        }
        if (node.type === 'capability' && node.effect) {
            if (!registry.effects.has(node.effect)) {
                errors.push(`Capability ${node.id} references unknown effect ${node.effect}`);
            }
        }
    }

    return { ok: errors.length === 0, errors };
}

export function getRegistry(): ComponentRegistry {
    return buildComponentRegistry();
}