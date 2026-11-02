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
    RevisionStoreConfig,
    RevisionSearchQuery,
    RevisionDriverConfig,
    RevisionDriver
} from './types.js';
import { FactoryRegistry, createPluginFactoryRegistry } from '../utils/PluginRegistry.js';

// Re-export types from shared location
export type { 
    Revision, 
    StrategyArtifact, 
    RevisionStatus, 
    RevisionStoreConfig,
    RevisionSearchQuery,
    RevisionDriverConfig,
    RevisionDriver
} from './types.js';

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

// --- SQLite Driver (Production Implementation) ---

export class SQLiteRevisionDriver implements RegistrableRevisionDriver {
    readonly name = 'sqlite';
    readonly description = 'SQLite-backed revision storage';
    
    private dbPath: string;
    private db: any; // Database from better-sqlite3
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
        
        // Dynamic import to avoid bundling issues
        const { mkdirSync } = await import('node:fs');
        const { dirname } = await import('node:path');
        
        const dbDir = dirname(this.dbPath);
        mkdirSync(dbDir, { recursive: true });
        
        // @ts-ignore - better-sqlite3 types not available
        const Database = (await import('better-sqlite3')).default;
        
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS revisions (
                id TEXT PRIMARY KEY,
                seam_role TEXT NOT NULL,
                strategy_id TEXT NOT NULL,
                seam_id TEXT NOT NULL,
                version TEXT NOT NULL,
                params TEXT NOT NULL,          -- JSON
                code TEXT,
                component_type TEXT,
                author TEXT NOT NULL,
                model TEXT,
                prompt_hash TEXT,
                parent_revision_id TEXT,
                evaluation_id TEXT,
                verdict TEXT,
                status TEXT NOT NULL,
                consented_by TEXT,
                consented_at TEXT,
                activated_at TEXT,
                rolled_back_at TEXT,
                rollback_reason TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                tags TEXT
            );
            
            CREATE INDEX IF NOT EXISTS idx_revisions_seam_role ON revisions(seam_role);
            CREATE INDEX IF NOT EXISTS idx_revisions_status ON revisions(status);
            CREATE INDEX IF NOT EXISTS idx_revisions_created_at ON revisions(created_at);
            CREATE INDEX IF NOT EXISTS idx_revisions_strategy_id ON revisions(strategy_id);
        `);
        
        this.initialized = true;
    }
    
    private rowToRevision(row: any): Revision {
        return {
            id: row.id,
            seamRole: row.seam_role,
            strategy: {
                id: row.strategy_id,
                seamId: row.seam_id,
                version: row.version,
                params: JSON.parse(row.params),
                code: row.code ?? undefined,
                componentType: row.component_type ?? undefined,
            },
            author: row.author,
            model: row.model ?? undefined,
            promptHash: row.prompt_hash ?? undefined,
            parentRevisionId: row.parent_revision_id ?? undefined,
            evaluationId: row.evaluation_id ?? undefined,
            verdict: row.verdict ?? undefined,
            status: row.status,
            consentedBy: row.consented_by ?? undefined,
            consentedAt: row.consented_at ?? undefined,
            activatedAt: row.activated_at ?? undefined,
            rolledBackAt: row.rolled_back_at ?? undefined,
            rollbackReason: row.rollback_reason ?? undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            tags: row.tags ? JSON.parse(row.tags) : undefined,
        };
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
        
        this.db.prepare(`
            INSERT INTO revisions (
                id, seam_role, strategy_id, seam_id, version, params, code, component_type,
                author, model, prompt_hash, parent_revision_id, evaluation_id, verdict,
                status, consented_by, consented_at, activated_at, rolled_back_at, rollback_reason,
                created_at, updated_at, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            fullRevision.id,
            fullRevision.seamRole,
            fullRevision.strategy.id,
            fullRevision.strategy.seamId,
            fullRevision.strategy.version,
            JSON.stringify(fullRevision.strategy.params),
            fullRevision.strategy.code ?? null,
            fullRevision.strategy.componentType ?? null,
            fullRevision.author,
            fullRevision.model ?? null,
            fullRevision.promptHash ?? null,
            fullRevision.parentRevisionId ?? null,
            fullRevision.evaluationId ?? null,
            fullRevision.verdict ?? null,
            fullRevision.status,
            fullRevision.consentedBy ?? null,
            fullRevision.consentedAt ?? null,
            fullRevision.activatedAt ?? null,
            fullRevision.rolledBackAt ?? null,
            fullRevision.rollbackReason ?? null,
            fullRevision.createdAt,
            fullRevision.updatedAt,
            fullRevision.tags ? JSON.stringify(fullRevision.tags) : null
        );
        
        return fullRevision;
    }
    
    async get(id: string): Promise<Revision | undefined> {
        await this.init(this.config);
        
        const row = this.db.prepare('SELECT * FROM revisions WHERE id = ?').get(id);
        return row ? this.rowToRevision(row) : undefined;
    }
    
    async getActive(seamRole: string): Promise<Revision | undefined> {
        await this.init(this.config);
        
        const row = this.db.prepare(`
            SELECT * FROM revisions 
            WHERE seam_role = ? AND status = 'active' 
            ORDER BY created_at DESC 
            LIMIT 1
        `).get(seamRole);
        
        return row ? this.rowToRevision(row) : undefined;
    }
    
    async updateStatus(id: string, status: RevisionStatus, metadata: Partial<Revision>): Promise<Revision | undefined> {
        await this.init(this.config);
        
        const revision = await this.get(id);
        if (!revision) return undefined;
        
        const updated: Revision = {
            ...revision,
            status,
            updatedAt: new Date().toISOString(),
            ...metadata,
        };
        
        this.db.prepare(`
            UPDATE revisions SET
                status = ?,
                updated_at = ?,
                verdict = ?,
                consented_by = ?,
                consented_at = ?,
                activated_at = ?,
                rolled_back_at = ?,
                rollback_reason = ?,
                tags = ?
            WHERE id = ?
        `).run(
            updated.status,
            updated.updatedAt,
            updated.verdict ?? null,
            updated.consentedBy ?? null,
            updated.consentedAt ?? null,
            updated.activatedAt ?? null,
            updated.rolledBackAt ?? null,
            updated.rollbackReason ?? null,
            updated.tags ? JSON.stringify(updated.tags) : null,
            id
        );
        
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
            consentedBy: userId,
            consentedAt: new Date().toISOString(),
        });
    }
    
    async search(query: RevisionSearchQuery): Promise<Revision[]> {
        await this.init(this.config);
        
        let sql = 'SELECT * FROM revisions WHERE 1=1';
        const params: any[] = [];
        
        if (query.seamRole) {
            sql += ' AND seam_role = ?';
            params.push(query.seamRole);
        }
        if (query.status) {
            sql += ' AND status = ?';
            params.push(query.status);
        }
        if (query.author) {
            sql += ' AND author = ?';
            params.push(query.author);
        }
        if (query.tags && query.tags.length > 0) {
            // For simplicity, we'll filter tags in memory
            // A proper implementation would use JSON functions
        }
        if (query.since) {
            sql += ' AND created_at >= ?';
            params.push(query.since);
        }
        if (query.until) {
            sql += ' AND created_at <= ?';
            params.push(query.until);
        }
        
        sql += ' ORDER BY created_at DESC';
        
        if (query.offset) {
            sql += ' OFFSET ?';
            params.push(query.offset);
        }
        if (query.limit) {
            sql += ' LIMIT ?';
            params.push(query.limit);
        }
        
        const rows = this.db.prepare(sql).all(...params);
        let results = rows.map((row: any) => this.rowToRevision(row));
        
        // Filter tags in memory if needed
        if (query.tags && query.tags.length > 0) {
            results = results.filter((r: any) => r.tags?.some((t: string) => query.tags!.includes(t)));
        }
        
        return results;
    }
    
    async count(): Promise<number> {
        await this.init(this.config);
        
        const row = this.db.prepare('SELECT COUNT(*) as count FROM revisions').get();
        return row?.count ?? 0;
    }
    
    async close(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.initialized = false;
    }
}

// --- RevisionDriver Registry ---

const { registry: revisionDriverRegistry, get: getRevisionDriverRegistry, reset: resetRevisionDriverRegistry } = 
    createPluginFactoryRegistry('RevisionDriver', [
        { name: 'jsonl', create: (...args: unknown[]) => new JSONLRevisionDriver(...(args as string[])), description: 'JSONL file-based storage' },
        { name: 'memory', create: () => new InMemoryRevisionDriver(), description: 'In-memory storage (testing)' },
        { name: 'sqlite', create: (...args: unknown[]) => new SQLiteRevisionDriver(...(args as string[])), description: 'SQLite-backed storage (stub)' },
    ]);

// --- Export registry and singleton ---
export { revisionDriverRegistry, getRevisionDriverRegistry, resetRevisionDriverRegistry };