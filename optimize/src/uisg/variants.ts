import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SurfaceVariant, SurfaceVariantStatus, VariantMetrics } from './types.js';

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
    return record;
}

export function archiveVariant(surface: string, id: string): VariantRecord {
    const data = loadVariants();
    const record = findVariant(data, surface, id);
    record.status = 'archived';
    record.updatedAt = new Date().toISOString();
    saveVariants(data);
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
