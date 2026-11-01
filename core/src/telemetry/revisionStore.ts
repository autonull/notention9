/**
 * RevisionStore — Immutable revision storage with JSONL persistence
 * Each revision is an immutable record of a strategy change proposal
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logEvent, type LedgerEventType, type LedgerPayload } from './ledger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', '.notention', 'revisions');
const REVISIONS_FILE = join(DATA_DIR, 'revisions.jsonl');

// Ensure directory exists
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

// --- Types ---

export interface Revision {
    // Identity
    id: string;                    // rev_<timestamp>_<random>
    seamRole: string;              // 'capture' | 'elicit' | 'match' | 'layout' | ...
    
    // Strategy definition (inline, self-contained)
    strategy: StrategyArtifact;
    
    // Provenance
    author: 'human' | 'model';
    model?: string;
    promptHash?: string;
    parentRevisionId?: string;
    
    // Evaluation linkage
    evaluationId?: string;
    verdict?: 'pass' | 'fail' | 'inconclusive';
    
    // Consent & activation
    status: RevisionStatus;
    consentedBy?: string;
    consentedAt?: string;
    activatedAt?: string;
    rolledBackAt?: string;
    rollbackReason?: string;
    
    // Metadata
    createdAt: string;
    updatedAt: string;
    tags?: string[];
}

export interface StrategyArtifact {
    id: string;
    seamId: string;
    version: string;
    params: Record<string, unknown>;
    code?: string;                 // Source code if model-generated
    componentType?: string;        // Component identifier for UI
}

export type RevisionStatus =
    | 'draft'
    | 'evaluating'
    | 'evaluated'
    | 'awaiting-consent'
    | 'consented'
    | 'active'
    | 'rolled-back'
    | 'superseded'
    | 'rejected';

export interface RevisionStoreConfig {
    maxRevisionsPerSeam?: number;  // Soft limit for cleanup
}

// --- RevisionStore class ---

export class RevisionStore {
    private revisions: Map<string, Revision> = new Map();
    private seamIndex: Map<string, string[]> = new Map(); // seamRole -> revisionIds (newest first)
    private statusIndex: Map<RevisionStatus, Set<string>> = new Map();
    private initialized = false;
    private config: RevisionStoreConfig;

    constructor(config: RevisionStoreConfig = {}) {
        this.config = {
            maxRevisionsPerSeam: 1000,
            ...config,
        };
    }

    private async init(): Promise<void> {
        if (this.initialized) return;
        
        if (existsSync(REVISIONS_FILE)) {
            const content = readFileSync(REVISIONS_FILE, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l.length > 0);
            
            for (const line of lines) {
                try {
                    const revision = JSON.parse(line) as Revision;
                    this.indexRevision(revision);
                } catch {
                    // Skip malformed
                }
            }
        }
        
        this.initialized = true;
    }

    private indexRevision(revision: Revision): void {
        this.revisions.set(revision.id, revision);
        
        // Seam index
        const seamRevisions = this.seamIndex.get(revision.seamRole) ?? [];
        seamRevisions.unshift(revision.id); // Newest first
        this.seamIndex.set(revision.seamRole, seamRevisions);
        
        // Status index
        const statusSet = this.statusIndex.get(revision.status) ?? new Set();
        statusSet.add(revision.id);
        this.statusIndex.set(revision.status, statusSet);
    }

    private persistRevision(revision: Revision): void {
        const line = JSON.stringify(revision) + '\n';
        appendFileSync(REVISIONS_FILE, line, 'utf-8');
        
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
        
        const now = new Date().toISOString();
        const id = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        
        const fullRevision: Revision = {
            ...revision,
            id,
            status: 'draft',
            createdAt: now,
            updatedAt: now,
        };
        
        this.indexRevision(fullRevision);
        this.persistRevision(fullRevision);
        
        return fullRevision;
    }

    /**
     * Get revision by ID
     */
    async get(id: string): Promise<Revision | undefined> {
        await this.init();
        return this.revisions.get(id);
    }

    /**
     * Get all revisions for a seam role (newest first)
     */
    async getBySeam(seamRole: string): Promise<Revision[]> {
        await this.init();
        const ids = this.seamIndex.get(seamRole) ?? [];
        return ids.map(id => this.revisions.get(id)!).filter(Boolean);
    }

    /**
     * Get revisions by status
     */
    async getByStatus(status: RevisionStatus): Promise<Revision[]> {
        await this.init();
        const ids = this.statusIndex.get(status) ?? new Set();
        return Array.from(ids).map(id => this.revisions.get(id)!).filter(Boolean);
    }

    /**
     * Get active revision for a seam role
     */
    async getActive(seamRole: string): Promise<Revision | undefined> {
        await this.init();
        const revisions = await this.getBySeam(seamRole);
        return revisions.find(r => r.status === 'active');
    }

    /**
     * Update revision status
     */
    async updateStatus(id: string, status: RevisionStatus, metadata: Partial<Revision> = {}): Promise<Revision | undefined> {
        await this.init();
        
        const revision = this.revisions.get(id);
        if (!revision) return undefined;
        
        // Remove from old status index
        const oldStatusSet = this.statusIndex.get(revision.status);
        if (oldStatusSet) {
            oldStatusSet.delete(id);
        }
        
        // Update revision
        const updated: Revision = {
            ...revision,
            status,
            updatedAt: new Date().toISOString(),
            ...metadata,
        };
        
        this.revisions.set(id, updated);
        
        // Add to new status index
        const newStatusSet = this.statusIndex.get(status) ?? new Set();
        newStatusSet.add(id);
        this.statusIndex.set(status, newStatusSet);
        
        // Persist (append new version)
        this.persistRevision(updated);
        
        // Log status change
        const eventType = this.statusToEventType(status);
        if (eventType) {
            logEvent({
                type: eventType,
                actor: 'system',
                revisionId: id,
                payload: this.createLedgerPayload(eventType, id, metadata),
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
    async search(query: {
        seamRole?: string;
        status?: RevisionStatus;
        author?: 'human' | 'model';
        tags?: string[];
        since?: string;
        until?: string;
        limit?: number;
    }): Promise<Revision[]> {
        await this.init();
        
        let results = Array.from(this.revisions.values());
        
        if (query.seamRole) {
            results = results.filter(r => r.seamRole === query.seamRole);
        }
        if (query.status) {
            results = results.filter(r => r.status === query.status);
        }
        if (query.author) {
            results = results.filter(r => r.author === query.author);
        }
        if (query.tags && query.tags.length > 0) {
            results = results.filter(r => r.tags?.some(t => query.tags!.includes(t)));
        }
        if (query.since) {
            const since = new Date(query.since).getTime();
            results = results.filter(r => new Date(r.createdAt).getTime() >= since);
        }
        if (query.until) {
            const until = new Date(query.until).getTime();
            results = results.filter(r => new Date(r.createdAt).getTime() <= until);
        }
        
        // Sort by createdAt descending
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        if (query.limit) {
            results = results.slice(0, query.limit);
        }
        
        return results;
    }

    /**
     * Get revision count
     */
    async count(): Promise<number> {
        await this.init();
        return this.revisions.size;
    }
}

// --- Singleton instance ---
let revisionStoreInstance: RevisionStore | null = null;

export function getRevisionStore(config?: RevisionStoreConfig): RevisionStore {
    if (!revisionStoreInstance) {
        revisionStoreInstance = new RevisionStore(config);
    }
    return revisionStoreInstance;
}

export function resetRevisionStore(): void {
    revisionStoreInstance = null;
}