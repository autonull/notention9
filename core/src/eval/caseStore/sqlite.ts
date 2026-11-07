/**
 * SQLite CaseStore Implementation
 * Persistent, queryable storage for large case sets
 */

import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { 
    CaseManifest, 
    CaseEntry, 
    IntentCase, 
    QualityCase, 
    CaseSplit, 
    QualityFamily 
} from '../../schemas/caseTypes.js';
import { 
    computeManifestHash,
    canonicalizeManifest, 
    generateManifestFromCases,
    buildIntentCaseEntry,
    buildQualityCaseEntry,
    verifyCaseHash,
} from './manifestUtils.js';
import { BaseCaseStore } from './baseCaseStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

export class SQLiteCaseStore extends BaseCaseStore {
    private db: DatabaseType;
    
    constructor(dbPath: string) {
        super();
        
        // Ensure directory exists
        const dbDir = dirname(dbPath);
        mkdirSync(dbDir, { recursive: true });
        
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
    }
    
    protected async doInit(): Promise<void> {
        // Create tables
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY,
                family TEXT NOT NULL,           -- 'intent' | 'quality'
                split TEXT,                     -- for intent: 'search' | 'validation' | 'holdout'
                quality_family TEXT,            -- for quality: 'extraction' | 'match'
                content TEXT NOT NULL,          -- JSON serialized case
                hash TEXT NOT NULL,             -- SHA-256 of content (first 16 chars)
                tags TEXT,                      -- JSON array of tags
                created_at TEXT NOT NULL,       -- ISO timestamp
                updated_at TEXT NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_cases_family ON cases(family);
            CREATE INDEX IF NOT EXISTS idx_cases_split ON cases(split);
            CREATE INDEX IF NOT EXISTS idx_cases_quality_family ON cases(quality_family);
            CREATE INDEX IF NOT EXISTS idx_cases_hash ON cases(hash);
            
            CREATE TABLE IF NOT EXISTS manifest (
                key TEXT PRIMARY KEY,           -- 'current'
                version INTEGER NOT NULL,
                hash TEXT NOT NULL,
                generated_at TEXT NOT NULL,
                counts TEXT NOT NULL,           -- JSON
                cases TEXT NOT NULL             -- JSON array of CaseEntry
            );
        `);
    }
    
    protected async loadManifest(): Promise<CaseManifest> {
        const row = this.db.prepare('SELECT * FROM manifest WHERE key = ?').get('current') as any;
        
        if (!row) {
            // Generate initial manifest from cases table
            return this.generateManifest();
        }
        
        return {
            version: row.version,
            hash: row.hash,
            generatedAt: row.generated_at,
            counts: JSON.parse(row.counts),
            cases: JSON.parse(row.cases),
        };
    }
    
    protected async persistManifest(manifest: CaseManifest): Promise<void> {
        const canonical = this.canonicalizeManifest(manifest);
        const manifestHash = sha256(canonical).slice(0, 16);
        
        const manifestWithHash = { ...manifest, hash: manifestHash };
        
        this.db.prepare(`
            INSERT OR REPLACE INTO manifest (key, version, hash, generated_at, counts, cases)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            'current',
            manifestWithHash.version,
            manifestHash,
            manifestWithHash.generatedAt,
            JSON.stringify(manifestWithHash.counts),
            JSON.stringify(manifestWithHash.cases)
        );
    }
    
    private canonicalizeManifest(manifest: Omit<CaseManifest, 'hash'>): string {
        const sorted = { ...manifest, cases: [...manifest.cases].sort((a, b) => a.id.localeCompare(b.id)) };
        return JSON.stringify(sorted, null, 2);
    }
    
    protected async generateManifest(): Promise<CaseManifest> {
        const rows = this.db.prepare('SELECT * FROM cases').all() as any[];
        
        const intentCases: CaseEntry[] = [];
        const qualityCases: CaseEntry[] = [];
        
        for (const row of rows) {
            const caseData = JSON.parse(row.content);
            const entry: CaseEntry = {
                id: row.id,
                family: row.family,
                split: row.split,
                qualityFamily: row.quality_family,
                path: '', // Not used in SQLite
                hash: row.hash,
                tags: JSON.parse(row.tags || '[]'),
            };
            
            if (row.family === 'intent') {
                intentCases.push(entry);
            } else {
                qualityCases.push(entry);
            }
        }
        
        const allCases = [...intentCases, ...qualityCases].sort((a, b) => a.id.localeCompare(b.id));
        
        const manifestWithoutHash: Omit<CaseManifest, 'hash'> = {
            version: 1,
            generatedAt: new Date().toISOString(),
            counts: {
                intent: {
                    search: intentCases.filter(c => c.split === 'search').length,
                    validation: intentCases.filter(c => c.split === 'validation').length,
                    holdout: intentCases.filter(c => c.split === 'holdout').length,
                },
                quality: {
                    extraction: qualityCases.filter(c => c.qualityFamily === 'extraction').length,
                    match: qualityCases.filter(c => c.qualityFamily === 'match').length,
                },
            },
            cases: allCases,
        };
        
        const canonical = this.canonicalizeManifest(manifestWithoutHash);
        const manifestHash = sha256(canonical).slice(0, 16);
        
        return {
            ...manifestWithoutHash,
            hash: manifestHash,
        };
    }
    
    protected async loadIntentCases(split: CaseSplit): Promise<IntentCase[]> {
        const rows = this.db.prepare('SELECT content FROM cases WHERE family = ? AND split = ?')
            .all('intent', split) as any[];
        
        return rows.map(row => JSON.parse(row.content) as IntentCase);
    }
    
    protected async loadQualityCases(qualityFamily: QualityFamily): Promise<QualityCase[]> {
        const rows = this.db.prepare('SELECT content FROM cases WHERE family = ? AND quality_family = ?')
            .all('quality', qualityFamily) as any[];
        
        return rows.map(row => JSON.parse(row.content) as QualityCase);
    }
    
    protected async loadCaseById(id: string): Promise<IntentCase | QualityCase | null> {
        const row = this.db.prepare('SELECT content FROM cases WHERE id = ?').get(id) as any;
        if (!row) return null;
        return JSON.parse(row.content) as IntentCase | QualityCase;
    }
    
    protected async storeCase(caseData: IntentCase | QualityCase): Promise<void> {
        const content = JSON.stringify(caseData);
        const hash = sha256(content).slice(0, 16);
        const now = new Date().toISOString();
        
        if (caseData.family === 'intent') {
            this.db.prepare(`
                INSERT OR REPLACE INTO cases (id, family, split, quality_family, content, hash, tags, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 
                    COALESCE((SELECT created_at FROM cases WHERE id = ?), ?),
                    ?
                )
            `).run(
                caseData.id,
                'intent',
                (caseData as any).split || 'search',
                null,
                content,
                hash,
                JSON.stringify(caseData.tags),
                caseData.id,
                now,
                now
            );
        } else {
            this.db.prepare(`
                INSERT OR REPLACE INTO cases (id, family, split, quality_family, content, hash, tags, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 
                    COALESCE((SELECT created_at FROM cases WHERE id = ?), ?),
                    ?
                )
            `).run(
                caseData.id,
                'quality',
                null,
                caseData.qualityFamily,
                content,
                hash,
                JSON.stringify(caseData.tags),
                caseData.id,
                now,
                now
            );
        }
    }
    
    protected async removeCase(id: string): Promise<boolean> {
        const result = this.db.prepare('DELETE FROM cases WHERE id = ?').run(id);
        return result.changes > 0;
    }
    
    protected async doClose(): Promise<void> {
        this.db.close();
    }
    
    // --- Additional SQLite-specific methods ---
    
    /** Get database statistics */
    getStats(): { totalCases: number; intentCases: number; qualityCases: number; dbSizeBytes: number } {
        const total = this.db.prepare('SELECT COUNT(*) as c FROM cases').get() as any;
        const intent = this.db.prepare('SELECT COUNT(*) as c FROM cases WHERE family = ?').get('intent') as any;
        const quality = this.db.prepare('SELECT COUNT(*) as c FROM cases WHERE family = ?').get('quality') as any;
        
        return {
            totalCases: total.c,
            intentCases: intent.c,
            qualityCases: quality.c,
            dbSizeBytes: this.db.prepare('PRAGMA page_count * page_size').get() as any,
        };
    }
    
    /** Query cases with custom SQL */
    queryCases(sql: string, params: any[] = []): any[] {
        return this.db.prepare(sql).all(...params);
    }
}