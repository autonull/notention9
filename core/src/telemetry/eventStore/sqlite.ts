/**
 * SQLite EventStore Implementation
 * Indexed, queryable event storage for production use
 */

import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore - better-sqlite3 types not available
import Database from 'better-sqlite3';
import type { LedgerEvent, LedgerEventType, LedgerPayload } from '../../telemetry/ledger.js';
import type { EventStore } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function generateId(): string {
    const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
    const random = Math.random().toString(36).substring(2, 12).toUpperCase();
    return `${timestamp}${random}`;
}

function computeHash(payload: LedgerPayload): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

export class SQLiteEventStore implements EventStore {
    private db: Database.Database;
    private initialized = false;
    
    constructor(dbPath: string) {
        const dbDir = dirname(dbPath);
        mkdirSync(dbDir, { recursive: true });
        
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
    }
    
    async init(): Promise<void> {
        if (this.initialized) return;
        
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                run_id TEXT,
                case_id TEXT,
                revision_id TEXT,
                evaluation_id TEXT,
                actor TEXT NOT NULL,
                user_id TEXT,
                model_id TEXT,
                payload TEXT NOT NULL,      -- JSON
                timestamp TEXT NOT NULL,    -- ISO string
                duration_ms INTEGER,
                hash TEXT NOT NULL,
                created_at TEXT NOT NULL    -- When we inserted it
            );
            
            CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
            CREATE INDEX IF NOT EXISTS idx_events_run_id ON events(run_id);
            CREATE INDEX IF NOT EXISTS idx_events_case_id ON events(case_id);
            CREATE INDEX IF NOT EXISTS idx_events_revision_id ON events(revision_id);
            CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
            CREATE INDEX IF NOT EXISTS idx_events_actor ON events(actor);
        `);
        
        this.initialized = true;
    }
    
    async append(event: Omit<LedgerEvent, 'id' | 'timestamp' | 'hash'>): Promise<LedgerEvent> {
        await this.init();
        
        const fullEvent: LedgerEvent = {
            ...event,
            id: generateId(),
            timestamp: new Date().toISOString(),
            hash: computeHash(event.payload),
        };
        
        this.db.prepare(`
            INSERT INTO events (id, type, run_id, case_id, revision_id, evaluation_id, actor, user_id, model_id, payload, timestamp, duration_ms, hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            fullEvent.id,
            fullEvent.type,
            fullEvent.runId ?? null,
            fullEvent.caseId ?? null,
            fullEvent.revisionId ?? null,
            fullEvent.evaluationId ?? null,
            fullEvent.actor,
            fullEvent.userId ?? null,
            fullEvent.modelId ?? null,
            JSON.stringify(fullEvent.payload),
            fullEvent.timestamp,
            fullEvent.durationMs ?? null,
            fullEvent.hash,
            fullEvent.timestamp
        );
        
        return fullEvent;
    }
    
    async query(options: {
        type?: string;
        runId?: string;
        caseId?: string;
        revisionId?: string;
        since?: string;
        until?: string;
        limit?: number;
        offset?: number;
    }): Promise<LedgerEvent[]> {
        await this.init();
        
        const conditions: string[] = [];
        const params: any[] = [];
        
        if (options.type) {
            conditions.push('type = ?');
            params.push(options.type);
        }
        if (options.runId) {
            conditions.push('run_id = ?');
            params.push(options.runId);
        }
        if (options.caseId) {
            conditions.push('case_id = ?');
            params.push(options.caseId);
        }
        if (options.revisionId) {
            conditions.push('revision_id = ?');
            params.push(options.revisionId);
        }
        if (options.since) {
            conditions.push('timestamp >= ?');
            params.push(options.since);
        }
        if (options.until) {
            conditions.push('timestamp <= ?');
            params.push(options.until);
        }
        
        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const limit = options.limit ?? 1000;
        const offset = options.offset ?? 0;
        
        const sql = `SELECT * FROM events ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const rows = this.db.prepare(sql).all(...params) as any[];
        
        return rows.map(row => ({
            id: row.id,
            type: row.type,
            runId: row.run_id,
            caseId: row.case_id,
            revisionId: row.revision_id,
            evaluationId: row.evaluation_id,
            actor: row.actor,
            userId: row.user_id,
            modelId: row.model_id,
            payload: JSON.parse(row.payload),
            timestamp: row.timestamp,
            durationMs: row.duration_ms,
            hash: row.hash,
        }));
    }
    
    async getRunEvents(runId: string): Promise<LedgerEvent[]> {
        return this.query({ runId, limit: 10000 });
    }
    
    async count(options?: { type?: string; runId?: string; since?: string; until?: string }): Promise<number> {
        await this.init();
        
        const conditions: string[] = [];
        const params: any[] = [];
        
        if (options?.type) {
            conditions.push('type = ?');
            params.push(options.type);
        }
        if (options?.runId) {
            conditions.push('run_id = ?');
            params.push(options.runId);
        }
        if (options?.since) {
            conditions.push('timestamp >= ?');
            params.push(options.since);
        }
        if (options?.until) {
            conditions.push('timestamp <= ?');
            params.push(options.until);
        }
        
        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const sql = `SELECT COUNT(*) as c FROM events ${whereClause}`;
        
        const row = this.db.prepare(sql).get(...params) as any;
        return row.c;
    }
    
    async prune(olderThan: string): Promise<number> {
        await this.init();
        
        const result = this.db.prepare('DELETE FROM events WHERE timestamp < ?').run(olderThan);
        return result.changes;
    }
    
    async exportRun(runId: string): Promise<string> {
        const events = await this.getRunEvents(runId);
        return JSON.stringify(events, null, 2);
    }
    
    async close(): Promise<void> {
        this.db.close();
        this.initialized = false;
    }
    
    // --- Additional methods ---
    
    /** Get database statistics */
    getStats(): { totalEvents: number; byType: Record<string, number>; dbSizeBytes: number } {
        const total = this.db.prepare('SELECT COUNT(*) as c FROM events').get() as any;
        
        const byTypeRows = this.db.prepare('SELECT type, COUNT(*) as c FROM events GROUP BY type').all() as any[];
        const byType: Record<string, number> = {};
        for (const row of byTypeRows) {
            byType[row.type] = row.c;
        }
        
        return {
            totalEvents: total.c,
            byType,
            dbSizeBytes: (this.db.prepare('PRAGMA page_count * page_size').get() as any),
        };
    }
}