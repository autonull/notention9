/**
 * RevisionStore — Immutable revision storage with JSONL persistence
 * Each revision is an immutable record of a strategy change proposal
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logEvent, type LedgerEventType, type LedgerPayload } from './ledger.js';
import { DEFAULT_MAX_REVISIONS_PER_SEAM } from './constants.js';
import type { Revision, StrategyArtifact, RevisionStatus, RevisionStoreConfig, RevisionSearchQuery } from './types.js';
import {
    createRevisionIndexes,
    RevisionIndexes,
    indexRevision,
    updateRevisionStatus,
    searchRevisions,
    getActiveRevision,
    getRevisionsBySeam,
    getRevisionsByStatus,
    countRevisions,
    loadRevisionsFromJSONL,
    persistRevisionToJSONL,
    createBaseRevision,
    statusToEventType,
    createLedgerPayload,
} from './revisionUtils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', '.notention', 'revisions');
const REVISIONS_FILE = join(DATA_DIR, 'revisions.jsonl');

// Ensure directory exists
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

// Re-export types from shared location
export type { Revision, StrategyArtifact, RevisionStatus, RevisionStoreConfig, RevisionSearchQuery } from './types.js';

// --- RevisionStore class ---

export class RevisionStore {
    private indexes: RevisionIndexes = createRevisionIndexes();
    private initialized = false;
    private config: RevisionStoreConfig;

    constructor(config: RevisionStoreConfig = {}) {
        this.config = {
            maxRevisionsPerSeam: DEFAULT_MAX_REVISIONS_PER_SEAM,
            ...config,
        };
    }

    private async init(): Promise<void> {
        if (this.initialized) return;
        
        await loadRevisionsFromJSONL(REVISIONS_FILE, this.indexes);
        this.initialized = true;
    }

    private persistRevision(revision: Revision): void {
        persistRevisionToJSONL(REVISIONS_FILE, revision);
        
        // Log to ledger
        logEvent({
            type: 'revision:created',
            actor: 'system',
            revisionId: revision.id,
            payload: { type: 'revision:created', revision },
        });
    }

    /**
     * Create a new revision
     */
    async create(revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Revision> {
        await this.init();
        
        const fullRevision = createBaseRevision(revision);
        
        indexRevision(this.indexes, fullRevision);
        this.persistRevision(fullRevision);
        
        return fullRevision;
    }

    /**
     * Get revision by ID
     */
    async get(id: string): Promise<Revision | undefined> {
        await this.init();
        return this.indexes.revisions.get(id);
    }

    /**
     * Get all revisions for a seam role (newest first)
     */
    async getBySeam(seamRole: string): Promise<Revision[]> {
        await this.init();
        return getRevisionsBySeam(this.indexes, seamRole);
    }

    /**
     * Get revisions by status
     */
    async getByStatus(status: RevisionStatus): Promise<Revision[]> {
        await this.init();
        return getRevisionsByStatus(this.indexes, status);
    }

    /**
     * Get active revision for a seam role
     */
    async getActive(seamRole: string): Promise<Revision | undefined> {
        await this.init();
        return getActiveRevision(this.indexes, seamRole);
    }

    /**
     * Update revision status
     */
    async updateStatus(id: string, status: RevisionStatus, metadata: Partial<Revision> = {}): Promise<Revision | undefined> {
        await this.init();
        
        const revision = this.indexes.revisions.get(id);
        if (!revision) return undefined;
        
        const updated = updateRevisionStatus(this.indexes, revision, status, metadata);
        
        // Persist (append new version)
        this.persistRevision(updated);
        
        // Log status change
        const eventType = statusToEventType(status);
        if (eventType) {
            logEvent({
                type: eventType,
                actor: 'system',
                revisionId: id,
                payload: createLedgerPayload(eventType, id, metadata),
            });
        }
        
        return updated;
    }

    private createLedgerPayload(eventType: LedgerEventType, revisionId: string, metadata: Partial<Revision>): LedgerPayload {
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

    private statusToEventType(status: RevisionStatus): LedgerEventType | null {
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

    /**
     * Activate a revision (automatically rolls back current active)
     */
    async activate(id: string, userId: string): Promise<Revision | undefined> {
        await this.init();
        
        const revision = await this.get(id);
        if (!revision) return undefined;
        
        // Find current active for this seam
        const currentActive = await this.getActive(revision.seamRole);
        
        // Roll back current active
        if (currentActive && currentActive.id !== id) {
            await this.updateStatus(currentActive.id, 'rolled-back', {
                rollbackReason: `Superseded by ${id}`,
                rolledBackAt: new Date().toISOString(),
            });
        }
        
        // Activate new revision
        return this.updateStatus(id, 'active', {
            activatedAt: new Date().toISOString(),
        });
    }

    /**
     * Request consent for a revision
     */
    async requestConsent(id: string, userId: string): Promise<Revision | undefined> {
        return this.updateStatus(id, 'awaiting-consent');
    }

    /**
     * Grant consent
     */
    async grantConsent(id: string, userId: string): Promise<Revision | undefined> {
        return this.updateStatus(id, 'consented', {
            consentedBy: userId,
            consentedAt: new Date().toISOString(),
        });
    }

    /**
     * Deny consent
     */
    async denyConsent(id: string, userId: string, reason: string): Promise<Revision | undefined> {
        return this.updateStatus(id, 'rejected', {
            rollbackReason: reason,
        });
    }

    /**
     * Link evaluation to revision
     */
    async linkEvaluation(id: string, evaluationId: string, verdict: 'pass' | 'fail' | 'inconclusive'): Promise<Revision | undefined> {
        return this.updateStatus(id, 'evaluated', {
            evaluationId,
            verdict,
        });
    }

    /**
     * Search revisions
     */
    async search(query: RevisionSearchQuery): Promise<Revision[]> {
        await this.init();
        return searchRevisions(this.indexes, query);
    }

    /**
     * Get revision count
     */
    async count(): Promise<number> {
        await this.init();
        return countRevisions(this.indexes);
    }
}

// --- Singleton instance ---
import { createSingleton } from '../utils/singletonFactory.js';
const { get: getRevisionStoreInstance, reset: resetRevisionStoreInstance } = createSingleton(() => new RevisionStore());

export function getRevisionStore(config?: RevisionStoreConfig): RevisionStore {
    // Note: config is only used on first call
    return getRevisionStoreInstance();
}

export function resetRevisionStore(): void {
    resetRevisionStoreInstance();
}