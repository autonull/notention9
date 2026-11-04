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
    RevisionDriver,
    RegistrableRevisionDriver
} from './types.js';
import { createFactoryRegistry, ValidationHelpers } from '../utils/Registry.js';
import { AsyncPlugin, generateRevisionId } from '../utils/BasePlugin.js';
import { createSeededRandom } from '../utils/common.js';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

// Re-export types from shared location
export type { 
    Revision, 
    StrategyArtifact, 
    RevisionStatus, 
    RevisionStoreConfig,
    RevisionSearchQuery,
    RevisionDriverConfig,
    RevisionDriver,
    RegistrableRevisionDriver
} from './types.js';

// --- Base Revision Driver Plugin ---

abstract class BaseRevisionDriverPlugin extends AsyncPlugin<RevisionDriverConfig> {
    abstract readonly name: string;
    abstract readonly description: string;
    readonly configSchema?: z.ZodSchema<RevisionDriverConfig> = undefined;

    protected revisions = new Map<string, Revision>();
    protected seamIndex = new Map<string, string[]>();
    protected statusIndex = new Map<RevisionStatus, Set<string>>();

    abstract getDefaultConfig(): RevisionDriverConfig;

    validateConfig(config: RevisionDriverConfig): { valid: boolean; errors: string[] } {
        return ValidationHelpers.combine(
            ValidationHelpers.string(config.filePath, 'filePath'),
            ValidationHelpers.string(config.dbPath, 'dbPath'),
            ValidationHelpers.positiveInt(config.maxRevisionsPerSeam, 'maxRevisionsPerSeam'),
        );
    }

    protected async onInit(): Promise<void> {
        // Default no-op - subclasses can override
    }

    protected indexRevision(revision: Revision): void {
        this.revisions.set(revision.id, revision);

        const seamRevisions = this.seamIndex.get(revision.seamRole) ?? [];
        seamRevisions.unshift(revision.id);
        this.seamIndex.set(revision.seamRole, seamRevisions);

        const statusSet = this.statusIndex.get(revision.status) ?? new Set();
        statusSet.add(revision.id);
        this.statusIndex.set(revision.status, statusSet);
    }

    protected removeFromIndex(revision: Revision): void {
        const seamRevisions = this.seamIndex.get(revision.seamRole);
        if (seamRevisions) {
            const idx = seamRevisions.indexOf(revision.id);
            if (idx >= 0) seamRevisions.splice(idx, 1);
        }
        const statusSet = this.statusIndex.get(revision.status);
        if (statusSet) {
            statusSet.delete(revision.id);
        }
    }

    protected updateIndex(revision: Revision): void {
        this.removeFromIndex(revision);
        this.indexRevision(revision);
    }

    async create(revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Revision> {
        await this.init(this.config);

        const now = new Date().toISOString();
        const id = generateRevisionId(Date.now());

        const fullRevision: Revision = {
            ...revision,
            id,
            status: 'draft',
            createdAt: now,
            updatedAt: now,
        };

        this.indexRevision(fullRevision);
        await this.persistRevision(fullRevision);

        return fullRevision;
    }

    abstract persistRevision(revision: Revision): Promise<void>;

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

        const updated: Revision = {
            ...revision,
            status,
            updatedAt: new Date().toISOString(),
            ...metadata,
        };

        this.updateIndex(updated);
        await this.persistRevision(updated);

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
            consentedBy: userId,
            consentedAt: new Date().toISOString(),
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

// --- JSONL Driver (Current Implementation) ---

export class JSONLRevisionDriver extends BaseRevisionDriverPlugin implements RegistrableRevisionDriver {
    readonly name = 'jsonl';
    readonly description = 'JSONL file-based revision storage';
    
    private filePath: string;

    constructor(filePath?: string) {
        super();
        this.filePath = filePath ?? '';
    }

    getDefaultConfig(): RevisionDriverConfig {
        return { 
            filePath: '.notention/revisions/revisions.jsonl',
            maxRevisionsPerSeam: 1000,
        };
    }

    validateConfig(config: RevisionDriverConfig): { valid: boolean; errors: string[] } {
        return ValidationHelpers.combine(
            ValidationHelpers.string(config.filePath, 'filePath'),
            ValidationHelpers.positiveInt(config.maxRevisionsPerSeam, 'maxRevisionsPerSeam'),
        );
    }

    protected async onInit(): Promise<void> {
        await super.onInit();
        
        this.filePath = this.config.filePath as string ?? this.filePath;
        
        if (!this.filePath) {
            throw new Error('JSONLRevisionDriver requires filePath in config');
        }
        
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
    }

    async persistRevision(revision: Revision): Promise<void> {
        const line = JSON.stringify(revision) + '\n';
        appendFileSync(this.filePath, line, 'utf-8');
    }
}

// --- In-Memory Driver (for Testing) ---

export class InMemoryRevisionDriver extends BaseRevisionDriverPlugin implements RegistrableRevisionDriver {
    readonly name = 'memory';
    readonly description = 'In-memory revision storage (for testing)';

    getDefaultConfig(): RevisionDriverConfig {
        return {};
    }

    validateConfig(_config: RevisionDriverConfig): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }

    async persistRevision(_revision: Revision): Promise<void> {
        // No-op for in-memory
    }
}

// --- SQLite Driver (Production Implementation) ---

export class SQLiteRevisionDriver extends BaseRevisionDriverPlugin implements RegistrableRevisionDriver {
    readonly name = 'sqlite';
    readonly description = 'SQLite-backed revision storage';
    
    private dbPath: string;
    private db: any; // Database from better-sqlite3

    constructor(dbPath?: string) {
        super();
        this.dbPath = dbPath ?? '';
    }

    getDefaultConfig(): RevisionDriverConfig {
        return { 
            dbPath: '.notention/revisions/revisions.db',
        };
    }

    validateConfig(config: RevisionDriverConfig): { valid: boolean; errors: string[] } {
        return ValidationHelpers.combine(
            ValidationHelpers.string(config.dbPath, 'dbPath'),
        );
    }

    protected async onInit(): Promise<void> {
        await super.onInit();
        
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
        
        // Load existing revisions into memory indexes
        const rows = this.db.prepare('SELECT * FROM revisions ORDER BY created_at DESC').all();
        for (const row of rows) {
            const revision = this.rowToRevision(row);
            this.indexRevision(revision);
        }
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

    async persistRevision(revision: Revision): Promise<void> {
        const isNew = !this.revisions.has(revision.id);
        
        if (isNew) {
            this.db.prepare(`
                INSERT INTO revisions (
                    id, seam_role, strategy_id, seam_id, version, params, code, component_type,
                    author, model, prompt_hash, parent_revision_id, evaluation_id, verdict,
                    status, consented_by, consented_at, activated_at, rolled_back_at, rollback_reason,
                    created_at, updated_at, tags
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                revision.id,
                revision.seamRole,
                revision.strategy.id,
                revision.strategy.seamId,
                revision.strategy.version,
                JSON.stringify(revision.strategy.params),
                revision.strategy.code ?? null,
                revision.strategy.componentType ?? null,
                revision.author,
                revision.model ?? null,
                revision.promptHash ?? null,
                revision.parentRevisionId ?? null,
                revision.evaluationId ?? null,
                revision.verdict ?? null,
                revision.status,
                revision.consentedBy ?? null,
                revision.consentedAt ?? null,
                revision.activatedAt ?? null,
                revision.rolledBackAt ?? null,
                revision.rollbackReason ?? null,
                revision.createdAt,
                revision.updatedAt,
                revision.tags ? JSON.stringify(revision.tags) : null
            );
        } else {
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
                revision.status,
                revision.updatedAt,
                revision.verdict ?? null,
                revision.consentedBy ?? null,
                revision.consentedAt ?? null,
                revision.activatedAt ?? null,
                revision.rolledBackAt ?? null,
                revision.rollbackReason ?? null,
                revision.tags ? JSON.stringify(revision.tags) : null,
                revision.id
            );
        }
    }

    // Override close to properly close DB connection
    async close(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        await super.close();
    }
}

// --- RevisionDriver Registry ---

const { registry: revisionDriverRegistry, get: getRevisionDriverRegistry, reset: resetRevisionDriverRegistry } = 
    createFactoryRegistry<RevisionDriver>('RevisionDriver', [
        { name: 'jsonl', create: (...args: unknown[]) => new JSONLRevisionDriver(...(args as string[])), description: 'JSONL file-based storage' },
        { name: 'memory', create: () => new InMemoryRevisionDriver(), description: 'In-memory storage (testing)' },
        { name: 'sqlite', create: (...args: unknown[]) => new SQLiteRevisionDriver(...(args as string[])), description: 'SQLite-backed storage' },
    ]);

// --- Export registry and singleton ---
export { revisionDriverRegistry, getRevisionDriverRegistry, resetRevisionDriverRegistry };