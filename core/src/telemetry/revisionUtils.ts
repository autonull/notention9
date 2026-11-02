/**
 * Shared Revision Utilities
 * Consolidates duplicate indexing, search, and persistence logic from RevisionStore and RevisionDriver
 */

import type { Revision, RevisionStatus, RevisionSearchQuery } from './types.js';

// --- Indexing ---

export interface RevisionIndexes {
    revisions: Map<string, Revision>;
    seamIndex: Map<string, string[]>;      // seamRole -> revisionIds (newest first)
    statusIndex: Map<RevisionStatus, Set<string>>;
}

export function createRevisionIndexes(): RevisionIndexes {
    return {
        revisions: new Map(),
        seamIndex: new Map(),
        statusIndex: new Map(),
    };
}

export function indexRevision(indexes: RevisionIndexes, revision: Revision): void {
    indexes.revisions.set(revision.id, revision);

    // Seam index
    const seamRevisions = indexes.seamIndex.get(revision.seamRole) ?? [];
    seamRevisions.unshift(revision.id);
    indexes.seamIndex.set(revision.seamRole, seamRevisions);

    // Status index
    const statusSet = indexes.statusIndex.get(revision.status) ?? new Set();
    statusSet.add(revision.id);
    indexes.statusIndex.set(revision.status, statusSet);
}

export function unindexRevision(indexes: RevisionIndexes, revision: Revision): void {
    indexes.revisions.delete(revision.id);

    const seamRevisions = indexes.seamIndex.get(revision.seamRole);
    if (seamRevisions) {
        const idx = seamRevisions.indexOf(revision.id);
        if (idx >= 0) seamRevisions.splice(idx, 1);
    }

    const statusSet = indexes.statusIndex.get(revision.status);
    if (statusSet) {
        statusSet.delete(revision.id);
    }
}

export function updateRevisionStatus(
    indexes: RevisionIndexes,
    revision: Revision,
    newStatus: RevisionStatus,
    metadata: Partial<Revision>
): Revision {
    // Remove from old status index
    const oldStatusSet = indexes.statusIndex.get(revision.status);
    if (oldStatusSet) {
        oldStatusSet.delete(revision.id);
    }

    // Update revision
    const updated: Revision = {
        ...revision,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        ...metadata,
    };

    // Re-index with new status
    unindexRevision(indexes, revision);
    indexRevision(indexes, updated);

    return updated;
}

// --- Search ---

export interface SearchFilters {
    seamRole?: string;
    status?: RevisionStatus;
    author?: string;
    tags?: string[];
    since?: string;
    until?: string;
}

export function filterRevisions(
    revisions: Revision[],
    filters: SearchFilters
): Revision[] {
    let results = revisions;

    if (filters.seamRole) {
        results = results.filter(r => r.seamRole === filters.seamRole);
    }
    if (filters.status) {
        results = results.filter(r => r.status === filters.status);
    }
    if (filters.author) {
        results = results.filter(r => r.author === filters.author);
    }
    if (filters.tags && filters.tags.length > 0) {
        results = results.filter(r => r.tags?.some(t => filters.tags!.includes(t)));
    }
    if (filters.since) {
        const since = new Date(filters.since).getTime();
        results = results.filter(r => new Date(r.createdAt).getTime() >= since);
    }
    if (filters.until) {
        const until = new Date(filters.until).getTime();
        results = results.filter(r => new Date(r.createdAt).getTime() <= until);
    }

    return results;
}

export function sortRevisionsByCreatedAtDesc(revisions: Revision[]): Revision[] {
    return [...revisions].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function paginateRevisions(
    revisions: Revision[],
    offset?: number,
    limit?: number
): Revision[] {
    let results = revisions;
    if (offset) results = results.slice(offset);
    if (limit) results = results.slice(0, limit);
    return results;
}

export function searchRevisions(
    indexes: RevisionIndexes,
    query: RevisionSearchQuery
): Revision[] {
    const allRevisions = Array.from(indexes.revisions.values());
    const filtered = filterRevisions(allRevisions, query);
    const sorted = sortRevisionsByCreatedAtDesc(filtered);
    return paginateRevisions(sorted, query.offset, query.limit);
}

export function getActiveRevision(indexes: RevisionIndexes, seamRole: string): Revision | undefined {
    const ids = indexes.seamIndex.get(seamRole) ?? [];
    for (const id of ids) {
        const rev = indexes.revisions.get(id);
        if (rev && rev.status === 'active') return rev;
    }
    return undefined;
}

export function getRevisionsBySeam(indexes: RevisionIndexes, seamRole: string): Revision[] {
    const ids = indexes.seamIndex.get(seamRole) ?? [];
    return ids.map(id => indexes.revisions.get(id)!).filter(Boolean);
}

export function getRevisionsByStatus(indexes: RevisionIndexes, status: RevisionStatus): Revision[] {
    const ids = indexes.statusIndex.get(status) ?? new Set();
    return Array.from(ids).map(id => indexes.revisions.get(id)!).filter(Boolean);
}

export function countRevisions(indexes: RevisionIndexes): number {
    return indexes.revisions.size;
}

// --- Persistence (JSONL) ---

export interface JSONLPersistenceConfig {
    filePath: string;
}

export async function loadRevisionsFromJSONL(
    filePath: string,
    indexes: RevisionIndexes
): Promise<number> {
    const { existsSync, readFileSync } = await import('node:fs');
    const { dirname, join } = await import('node:path');

    if (!existsSync(filePath)) return 0;

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);

    let loaded = 0;
    for (const line of lines) {
        try {
            const revision = JSON.parse(line) as Revision;
            indexRevision(indexes, revision);
            loaded++;
        } catch {
            // Skip malformed lines
        }
    }
    return loaded;
}

export function persistRevisionToJSONL(filePath: string, revision: Revision): void {
    const { appendFileSync } = require('node:fs');
    const line = JSON.stringify(revision) + '\n';
    appendFileSync(filePath, line, 'utf-8');
}

export async function ensureJSONLDir(filePath: string): Promise<void> {
    const { existsSync, mkdirSync } = await import('node:fs');
    const { dirname } = await import('node:path');

    const dir = dirname(filePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

// --- Revision Creation ---

export function createRevisionId(): string {
    return `rev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

export function createRevisionTimestamp(): string {
    return new Date().toISOString();
}

export function createBaseRevision(
    revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Revision {
    const now = createRevisionTimestamp();
    return {
        ...revision,
        id: createRevisionId(),
        status: 'draft',
        createdAt: now,
        updatedAt: now,
    };
}

// --- Status to Event Type Mapping ---

import type { LedgerEventType } from './ledger.js';
import type { LedgerPayload } from '../telemetry/types.js';

export function statusToEventType(status: RevisionStatus): LedgerEventType | null {
    switch (status) {
        case 'evaluated': return 'revision:evaluated';
        case 'consented': return 'revision:consented';
        case 'active': return 'revision:activated';
        case 'rolled-back': return 'revision:rolled-back';
        case 'superseded': return 'revision:superseded';
        case 'rejected': return 'revision:rejected';
        default: return null;
    }
}

export function createLedgerPayload(
    eventType: LedgerEventType,
    revisionId: string,
    metadata: Partial<Revision>
): LedgerPayload {
    switch (eventType) {
        case 'revision:evaluated':
            return { type: 'revision:evaluated', revisionId, evaluationId: metadata.evaluationId ?? '', verdict: metadata.verdict ?? 'inconclusive' };
        case 'revision:consented':
            return { type: 'revision:consented', revisionId, userId: metadata.consentedBy ?? '' };
        case 'revision:activated':
            return { type: 'revision:activated', revisionId, previousRevisionId: metadata.parentRevisionId };
        case 'revision:rolled-back':
            return { type: 'revision:rolled-back', revisionId, reason: metadata.rollbackReason ?? '', rolledBackToRevisionId: metadata.parentRevisionId };
        case 'revision:superseded':
            return { type: 'revision:superseded', revisionId, supersededByRevisionId: metadata.parentRevisionId ?? '' };
        case 'revision:rejected':
            return { type: 'revision:rejected', revisionId, reason: metadata.rollbackReason ?? '' };
        default:
            return { type: 'revision:created', revision: { id: revisionId } as any };
    }
}