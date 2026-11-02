/**
 * RevisionDriver Interface + Implementations
 * Pluggable revision storage: JSONL (current), SQLite, in-memory
 * Replaces hardcoded RevisionStore with swappable driver
 */

import { z } from 'zod';
import type { 
    Revision, 
    StrategyArtifact, 
    RevisionStatus,
    RevisionStoreConfig 
} from '../telemetry/revisionStore.js';
import { FactoryRegistry } from '../utils/Registry.js';

// --- RevisionDriver Config ---

export interface RevisionDriverConfig {
    // Common config
    [key: string]: unknown;
}

export interface RevisionDriver {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema;
    
    /**
     * Initialize the driver
     */
    init(config: RevisionDriverConfig): Promise<void>;
    
    /**
     * Create a new revision
     */
    create(revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Revision>;
    
    /**
     * Get revision by ID
     */
    get(id: string): Promise<Revision | undefined>;
    
    /**
     * Get active revision for a seam role
     */
    getActive(seamRole: string): Promise<Revision | undefined>;
    
    /**
     * Update revision status and metadata
     */
    updateStatus(id: string, status: RevisionStatus, metadata: Partial<Revision>): Promise<Revision | undefined>;
    
    /**
     * Activate a revision (automatically rolls back current active)
     */
    activate(id: string, userId: string): Promise<Revision | undefined>;
    
    /**
     * Search revisions with filters
     */
    search(query: RevisionSearchQuery): Promise<Revision[]>;
    
    /**
     * Get revision count
     */
    count(): Promise<number>;
    
    /**
     * Close the driver
     */
    close(): Promise<void>;
    
    /**
     * Get default configuration
     */
    getDefaultConfig(): RevisionDriverConfig;
    
    /**
     * Validate configuration
     */
    validateConfig(config: RevisionDriverConfig): { valid: boolean; errors: string[] };
}

export interface RevisionSearchQuery {
    seamRole?: string;
    status?: RevisionStatus;
    author?: 'human' | 'model';
    tags?: string[];
    since?: string;
    until?: string;
    limit?: number;
    offset?: number;
}

// --- RevisionDriver Registrable mixin ---
type RegistrableRevisionDriver = RevisionDriver & { getDefaultConfig(): RevisionDriverConfig; validateConfig(config: RevisionDriverConfig): { valid: boolean; errors: string[] } };

// --- JSONL Driver (Current Implementation) ---

export class JSONLRevisionDriver implements RegistrableRevisionDriver {
    readonly name = 'jsonl';
    readonly description = 'JSONL file-based revision storage';
    
    private revisions: Map<string, Revision> = new Map();
    private seamIndex: Map<string, string[]> = new Map();
    private statusIndex: Map<RevisionStatus, Set<string>> = new Map();
    private initialized = false;
    private filePath: string;
    private config: RevisionDriverConfig;
    
    constructor(filePath?: string) {
        this.filePath = filePath ?? '';
        this.config = {};
    }
    
    getDefaultConfig(): RevisionDriverConfig {
        return { 
            filePath: '.notention/revisions/revisions.jsonl',
            maxRevisionsPerSeam: 1000,
        };
    }
    
    validateConfig(config: RevisionDriverConfig): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (config.filePath && typeof config.filePath !== 'string') {
            errors.push('filePath must be a string');
        }
        if (config.maxRevisionsPerSeam && typeof config.maxRevisionsPerSeam !== 'number') {
            errors.push('maxRevisionsPerSeam must be a number');
        }
        return { valid: errors.length === 0, errors };
    }
    
    async init(config: RevisionDriverConfig): Promise<void> {
        if (this.initialized) return;
        
        this.config = { ...this.getDefaultConfig(), ...config };
        this.filePath = this.config.filePath as string ?? this.filePath;
        
        if (!this.filePath) {
            throw new Error('JSONLRevisionDriver requires filePath in config');
        }
        
        // Import fs dynamically
        const { existsSync, mkdirSync, readFileSync } = await import('node:fs');
        const { dirname } = await import('node:path');
        
        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        
        if (existsSync(this.filePath)) {
            const content = readFileSync(this.filePath, 'utf-8');
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
        seamRevisions.unshift(revision.id);
        this.seamIndex.set(revision.seamRole, seamRevisions);
        
        // Status index
        const statusSet = this.statusIndex.get(revision.status) ?? new Set();
        statusSet.add(revision.id);
        this.statusIndex.set(revision.status, statusSet);
    }
    
    private persistRevision(revision: Revision): void {
        // Import fs dynamically
        const { appendFileSync } = require('node:fs');
        const line = JSON.stringify(revision) + '\n';
        appendFileSync(this.filePath, line, 'utf-8');
    }
    
    async create(revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Revision> {
        await this.init(this.config);
        
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
    
    async get(id: string): Promise<Revision | undefined> {
        await this.init(this.config);
        return this.revisions.get(id);
    }
    
    async getActive(seamRole: string): Promise<Revision | undefined> {
        await this.init(this.config);
        const ids = this.seamIndex.get(seamRole) ?? [];
        for (const id of ids) {
            const rev = this.revisions.get(id);
            if (rev && rev.status === 'active') return rev;
        }
        return undefined;
    }
    
    async updateStatus(id: string, status: RevisionStatus, metadata: Partial<Revision>): Promise<Revision | undefined> {
        await this.init(this.config);
        
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
        
        return updated;
    }
    
    async activate(id: string, userId: string): Promise<Revision | undefined> {
        await this.init(this.config);
        
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
    
    async search(query: RevisionSearchQuery): Promise<Revision[]> {
        await this.init(this.config);
        
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
        
        if (query.offset) {
            results = results.slice(query.offset);
        }
        if (query.limit) {
            results = results.slice(0, query.limit);
        }
        
        return results;
    }
    
    async count(): Promise<number> {
        await this.init(this.config);
        return this.revisions.size;
    }
    
    async close(): Promise<void> {
        this.revisions.clear();
        this.seamIndex.clear();
        this.statusIndex.clear();
        this.initialized = false;
    }
}

// --- In-Memory Driver (for Testing) ---

export class InMemoryRevisionDriver implements RegistrableRevisionDriver {
    readonly name = 'memory';
    readonly description = 'In-memory revision storage (for testing)';
    
    private revisions: Map<string, Revision> = new Map();
    private seamIndex: Map<string, string[]> = new Map();
    private statusIndex: Map<RevisionStatus, Set<string>> = new Map();
    private initialized = false;
    private config: RevisionDriverConfig = {};
    
    getDefaultConfig(): RevisionDriverConfig {
        return {};
    }
    
    validateConfig(_config: RevisionDriverConfig): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }
    
    async init(config: RevisionDriverConfig): Promise<void> {
        this.config = { ...this.getDefaultConfig(), ...config };
        this.initialized = true;
    }
    
    private indexRevision(revision: Revision): void {
        this.revisions.set(revision.id, revision);
        
        const seamRevisions = this.seamIndex.get(revision.seamRole) ?? [];
        seamRevisions.unshift(revision.id);
        this.seamIndex.set(revision.seamRole, seamRevisions);
        
        const statusSet = this.statusIndex.get(revision.status) ?? new Set();
        statusSet.add(revision.id);
        this.statusIndex.set(revision.status, statusSet);
    }
    
    async create(revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Revision> {
        await this.init(this.config);
        
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
        return fullRevision;
    }
    
    async get(id: string): Promise<Revision | undefined> {
        await this.init(this.config);
        return this.revisions.get(id);
    }
    
    async getActive(seamRole: string): Promise<Revision | undefined> {
        await this.init(this.config);
        const ids = this.seamIndex.get(seamRole) ?? [];
        for (const id of ids) {
            const rev = this.revisions.get(id);
            if (rev && rev.status === 'active') return rev;
        }
        return undefined;
    }
    
    async updateStatus(id: string, status: RevisionStatus, metadata: Partial<Revision>): Promise<Revision | undefined> {
        await this.init(this.config);
        
        const revision = this.revisions.get(id);
        if (!revision) return undefined;
        
        const oldStatusSet = this.statusIndex.get(revision.status);
        if (oldStatusSet) {
            oldStatusSet.delete(id);
        }
        
        const updated: Revision = {
            ...revision,
            status,
            updatedAt: new Date().toISOString(),
            ...metadata,
        };
        
        this.revisions.set(id, updated);
        
        const newStatusSet = this.statusIndex.get(status) ?? new Set();
        newStatusSet.add(id);
        this.statusIndex.set(status, newStatusSet);
        
        return updated;
    }
    
    async activate(id: string, userId: string): Promise<Revision | undefined> {
        await this.init(this.config);
        
        const revision = await this.get(id);
        if (!revision) return undefined;
        
        const currentActive = await this.getActive(revision.seamRole);
        
        if (currentActive && currentActive.id !== id) {
            await this.updateStatus(currentActive.id, 'rolled-back', {
                rollbackReason: `Superseded by ${id}`,
                rolledBackAt: new Date().toISOString(),
            });
        }
        
        return this.updateStatus(id, 'active', {
            activatedAt: new Date().toISOString(),
        });
    }
    
    async search(query: RevisionSearchQuery): Promise<Revision[]> {
        await this.init(this.config);
        
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
        
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        if (query.offset) {
            results = results.slice(query.offset);
        }
        if (query.limit) {
            results = results.slice(0, query.limit);
        }
        
        return results;
    }
    
    async count(): Promise<number> {
        await this.init(this.config);
        return this.revisions.size;
    }
    
    async close(): Promise<void> {
        this.revisions.clear();
        this.seamIndex.clear();
        this.statusIndex.clear();
        this.initialized = false;
    }
}

// --- SQLite Driver (Stub for Future) ---

export class SQLiteRevisionDriver implements RegistrableRevisionDriver {
    readonly name = 'sqlite';
    readonly description = 'SQLite-backed revision storage';
    
    private dbPath: string;
    private initialized = false;
    private config: RevisionDriverConfig;
    
    constructor(dbPath?: string) {
        this.dbPath = dbPath ?? '';
        this.config = {};
    }
    
    getDefaultConfig(): RevisionDriverConfig {
        return { 
            dbPath: '.notention/revisions/revisions.db',
        };
    }
    
    validateConfig(config: RevisionDriverConfig): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (config.dbPath && typeof config.dbPath !== 'string') {
            errors.push('dbPath must be a string');
        }
        return { valid: errors.length === 0, errors };
    }
    
    async init(config: RevisionDriverConfig): Promise<void> {
        if (this.initialized) return;
        
        this.config = { ...this.getDefaultConfig(), ...config };
        this.dbPath = this.config.dbPath as string ?? this.dbPath;
        
        if (!this.dbPath) {
            throw new Error('SQLiteRevisionDriver requires dbPath in config');
        }
        
        // TODO: Implement SQLite initialization
        // For now, mark as initialized but operations will throw
        this.initialized = true;
        throw new Error('SQLiteRevisionDriver not yet implemented');
    }
    
    async create(_revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Revision> {
        throw new Error('SQLiteRevisionDriver not yet implemented');
    }
    
    async get(_id: string): Promise<Revision | undefined> {
        throw new Error('SQLiteRevisionDriver not yet implemented');
    }
    
    async getActive(_seamRole: string): Promise<Revision | undefined> {
        throw new Error('SQLiteRevisionDriver not yet implemented');
    }
    
    async updateStatus(_id: string, _status: RevisionStatus, _metadata: Partial<Revision>): Promise<Revision | undefined> {
        throw new Error('SQLiteRevisionDriver not yet implemented');
    }
    
    async activate(_id: string, _userId: string): Promise<Revision | undefined> {
        throw new Error('SQLiteRevisionDriver not yet implemented');
    }
    
    async search(_query: RevisionSearchQuery): Promise<Revision[]> {
        throw new Error('SQLiteRevisionDriver not yet implemented');
    }
    
    async count(): Promise<number> {
        throw new Error('SQLiteRevisionDriver not yet implemented');
    }
    
    async close(): Promise<void> {
        this.initialized = false;
    }
}

// --- RevisionDriver Registry ---

const revisionDriverRegistry = new FactoryRegistry({
    errorPrefix: 'RevisionDriverRegistry',
});

revisionDriverRegistry.register('jsonl', (...args: unknown[]) => new JSONLRevisionDriver(...(args as string[])), 'JSONL file-based storage');
revisionDriverRegistry.register('memory', () => new InMemoryRevisionDriver(), 'In-memory storage (testing)');
revisionDriverRegistry.register('sqlite', (...args: unknown[]) => new SQLiteRevisionDriver(...(args as string[])), 'SQLite-backed storage (stub)');

// --- Backward-compatible singleton functions ---

let revisionDriverRegistryInstance: typeof revisionDriverRegistry | null = null;

export function getRevisionDriverRegistry(): typeof revisionDriverRegistry {
    if (!revisionDriverRegistryInstance) {
        revisionDriverRegistryInstance = revisionDriverRegistry;
    }
    return revisionDriverRegistryInstance;
}

export function resetRevisionDriverRegistry(): void {
    revisionDriverRegistryInstance = null;
}

export { revisionDriverRegistry, revisionDriverRegistry as RevisionDriverRegistry };

// --- Re-export types ---
export type { 
    Revision, 
    StrategyArtifact, 
    RevisionStatus,
    RevisionStoreConfig 
} from '../telemetry/revisionStore.js';