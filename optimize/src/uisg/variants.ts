import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SurfaceVariant, SurfaceVariantStatus, VariantMetrics, UisgSurface } from './types.js';
import { loadGraph, saveGraph } from './cli.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DEFAULT_FILE = resolve(ROOT, 'doc/uisg/variants.json');

export interface VariantRecord extends SurfaceVariant {
    surface: string;
    id: string;
    createdAt: string;
    updatedAt: string;
}

export interface VariantsData {
    version: number;
    updatedAt: string;
    variants: VariantRecord[];
}

export type VariantPatch = Partial<Pick<SurfaceVariant, 'template' | 'propsSchema' | 'strategyOverrides' | 'description'>>;

export interface VariantDiff {
    surface: string;
    from: string;
    to: string;
    changes: Array<{ field: string; before: unknown; after: unknown }>;
}

const variantsFile = (): string => process.env.NOTENTION_UISG_VARIANTS ?? DEFAULT_FILE;

const empty = (): VariantsData => ({ version: 1, updatedAt: new Date().toISOString(), variants: [] });

export function loadVariants(): VariantsData {
    try {
        return JSON.parse(readFileSync(variantsFile(), 'utf8')) as VariantsData;
    } catch {
        return empty();
    }
}

function saveVariants(data: VariantsData): void {
    writeFileSync(variantsFile(), JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2) + '\n');
}

function findVariant(data: VariantsData, surface: string, id: string): VariantRecord {
    const variant = data.variants.find(record => record.surface === surface && record.id === id);
    if (!variant) throw new Error(`Variant ${surface}/${id} not found`);
    return variant;
}

export function listVariants(filter: { surface?: string; status?: SurfaceVariantStatus } = {}): VariantRecord[] {
    return loadVariants().variants.filter(record =>
        (!filter.surface || record.surface === filter.surface) &&
        (!filter.status || record.status === filter.status));
}

export function createVariant(surface: string, id: string, patch: VariantPatch = {}, fromId?: string): VariantRecord {
    const data = loadVariants();
    if (data.variants.some(record => record.surface === surface && record.id === id)) {
        throw new Error(`Variant ${surface}/${id} already exists`);
    }
    const base = fromId ? findVariant(data, surface, fromId) : undefined;
    const now = new Date().toISOString();
    const record: VariantRecord = {
        template: base?.template,
        propsSchema: base?.propsSchema,
        strategyOverrides: base?.strategyOverrides,
        description: base?.description ?? `${id} variant of ${surface}`,
        status: 'experimental',
        ...patch,
        surface,
        id,
        createdAt: now,
        updatedAt: now,
    };
    data.variants.push(record);
    saveVariants(data);

    // Update graph.json
    const graph = loadGraph(new Map());
    const surfaceIdx = graph.nodes.findIndex(n => n.id === surface && n.type === 'surface');
    if (surfaceIdx >= 0) {
        const surfaceNode = graph.nodes[surfaceIdx] as UisgSurface;
        const variants = { ...surfaceNode.variants };
        variants[id] = {
            template: record.template,
            propsSchema: record.propsSchema,
            strategyOverrides: record.strategyOverrides,
            description: record.description,
            status: record.status,
            promotedAt: record.promotedAt,
            metrics: record.metrics,
        };
        graph.nodes[surfaceIdx] = { ...surfaceNode, variants };
        saveGraph(graph);
    }

    return record;
}

export function promoteVariant(surface: string, id: string, metrics?: VariantMetrics): VariantRecord {
    const data = loadVariants();
    const record = findVariant(data, surface, id);
    const now = new Date().toISOString();
    record.status = 'promoted';
    record.promotedAt = now;
    record.updatedAt = now;
    if (metrics) record.metrics = metrics;
    saveVariants(data);

    // Update graph.json
    const graph = loadGraph(new Map());
    const surfaceIdx = graph.nodes.findIndex(n => n.id === surface && n.type === 'surface');
    if (surfaceIdx >= 0) {
        const surfaceNode = graph.nodes[surfaceIdx] as UisgSurface;
        const variants = { ...surfaceNode.variants };
        if (variants[id]) {
            variants[id] = { ...variants[id], status: 'promoted', promotedAt: now, metrics: record.metrics };
        }
        graph.nodes[surfaceIdx] = { ...surfaceNode, variants, defaultVariant: id };
        saveGraph(graph);
    }

    return record;
}

export function archiveVariant(surface: string, id: string): VariantRecord {
    const data = loadVariants();
    const record = findVariant(data, surface, id);
    record.status = 'archived';
    record.updatedAt = new Date().toISOString();
    saveVariants(data);

    // Update graph.json
    const graph = loadGraph(new Map());
    const surfaceIdx = graph.nodes.findIndex(n => n.id === surface && n.type === 'surface');
    if (surfaceIdx >= 0) {
        const surfaceNode = graph.nodes[surfaceIdx] as UisgSurface;
        const variants = { ...surfaceNode.variants };
        if (variants[id]) {
            variants[id] = { ...variants[id], status: 'archived' };
        }
        if (surfaceNode.defaultVariant === id) {
            // Clear default if archiving the default variant
            const { [id]: removed, ...remainingVariants } = variants;
            graph.nodes[surfaceIdx] = { ...surfaceNode, variants: remainingVariants, defaultVariant: undefined };
        } else {
            graph.nodes[surfaceIdx] = { ...surfaceNode, variants };
        }
        saveGraph(graph);
    }

    return record;
}

export function diffVariants(surface: string, fromId: string, toId: string): VariantDiff {
    const data = loadVariants();
    const from = findVariant(data, surface, fromId);
    const to = findVariant(data, surface, toId);
    const fields = ['template', 'propsSchema', 'strategyOverrides', 'description', 'status', 'promotedAt', 'metrics'] as const;
    const changes = fields
        .filter(field => JSON.stringify(from[field]) !== JSON.stringify(to[field]))
        .map(field => ({ field, before: from[field], after: to[field] }));
    return { surface, from: fromId, to: toId, changes };
}

export function exportVariants(surface: string, format: 'md' | 'json' = 'md'): string {
    const variants = listVariants({ surface });
    if (format === 'json') return JSON.stringify(variants, null, 2);
    const rows = variants.map(record =>
        `| ${record.id} | ${record.status} | ${record.description} | ${record.metrics ? JSON.stringify(record.metrics) : ''} |`);
    return [
        `# Variants: ${surface}`,
        '',
        '| Variant | Status | Description | Metrics |',
        '| --- | --- | --- | --- |',
        ...rows,
    ].join('\n');
}

export function rollbackVariant(surface: string, variantId: string): VariantRecord {
    const data = loadVariants();
    const record = findVariant(data, surface, variantId);
    if (record.status !== 'promoted') {
        throw new Error(`Variant ${surface}/${variantId} is not promoted; cannot rollback`);
    }
    const now = new Date().toISOString();
    record.status = 'candidate';
    record.updatedAt = now;
    saveVariants(data);

    // Update graph.json - restore previous default variant if available
    const graph = loadGraph(new Map());
    const surfaceIdx = graph.nodes.findIndex(n => n.id === surface && n.type === 'surface');
    if (surfaceIdx >= 0) {
        const surfaceNode = graph.nodes[surfaceIdx] as UisgSurface;
        const variants = { ...surfaceNode.variants };
        if (variants[variantId]) {
            variants[variantId] = { ...variants[variantId], status: 'candidate' };
        }
        // Find the most recently promoted variant (excluding the one being rolled back)
        let previousDefault: string | undefined;
        let previousPromotedAt = '';
        for (const [id, v] of Object.entries(variants)) {
            if (id !== variantId && v.promotedAt && v.promotedAt > previousPromotedAt) {
                previousPromotedAt = v.promotedAt;
                previousDefault = id;
            }
        }
        graph.nodes[surfaceIdx] = { ...surfaceNode, variants, defaultVariant: previousDefault };
        saveGraph(graph);
    }

    return record;
}

export function syncVariants(): { added: number; updated: number; removed: number } {
    const variantsData = loadVariants();
    const graph = loadGraph(new Map());
    let added = 0;
    let updated = 0;
    let removed = 0;

    // Build map of variants from variants.json
    const variantMap = new Map<string, Map<string, VariantRecord>>();
    for (const record of variantsData.variants) {
        if (!variantMap.has(record.surface)) {
            variantMap.set(record.surface, new Map());
        }
        variantMap.get(record.surface)!.set(record.id, record);
    }

    // Update graph surfaces
    for (const node of graph.nodes) {
        if (node.type !== 'surface') continue;
        const surfaceId = node.id;
        const surfaceVariants = variantMap.get(surfaceId);
        const graphVariants = node.variants ?? {};

        if (!surfaceVariants) {
            // No variants in variants.json for this surface - remove all from graph
            if (Object.keys(graphVariants).length > 0) {
                node.variants = undefined;
                node.defaultVariant = undefined;
                removed += Object.keys(graphVariants).length;
            }
            continue;
        }

        const newVariants: Record<string, SurfaceVariant> = {};
        for (const [id, record] of surfaceVariants) {
            if (!graphVariants[id]) {
                added++;
            } else {
                updated++;
            }
            newVariants[id] = {
                template: record.template,
                propsSchema: record.propsSchema,
                strategyOverrides: record.strategyOverrides,
                description: record.description,
                status: record.status,
                promotedAt: record.promotedAt,
                metrics: record.metrics,
            };
        }

        // Count removed
        for (const id of Object.keys(graphVariants)) {
            if (!surfaceVariants.has(id)) {
                removed++;
            }
        }

        node.variants = newVariants;
        // Preserve defaultVariant if it still exists, otherwise clear
        if (node.defaultVariant && !newVariants[node.defaultVariant]) {
            node.defaultVariant = undefined;
        }
    }

    saveGraph(graph);
    return { added, updated, removed };
}
