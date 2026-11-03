/**
 * SQLite CaseStore Implementation
 * Persistent, queryable storage for large case sets
 */

import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import type { 
    CaseManifest, 
    CaseEntry, 
    IntentCase, 
    QualityCase, 
    CaseSplit, 
    QualityFamily 
} from '../../schemas/caseTypes.js';
import type { CaseStore } from '../../schemas/sharedTypes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

export class SQLiteCaseStore implements CaseStore {
    private db: Database;
    private manifestCache: CaseManifest | null = null;
    private initialized = false;
    
    constructor(dbPath: string) {
        // Ensure directory exists
        const dbDir = dirname(dbPath);
        mkdirSync(dbDir, { recursive: true });
        
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
    }
    
    async init(): Promise<void> {
        if (this.initialized) return;
        
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
        
        this.initialized = true;
    }
    
    async readManifest(): Promise<CaseManifest> {
        await this.init();
        
        if (this.manifestCache) return this.manifestCache;
        
        const row = this.db.prepare('SELECT * FROM manifest WHERE key = ?').get('current') as any;
        
        if (!row) {
            // Generate initial manifest from cases table
            const manifest = await this.generateManifest();
            await this.writeManifest(manifest);
            return manifest;
        }
        
        const manifest: CaseManifest = {
            version: row.version,
            hash: row.hash,
            generatedAt: row.generated_at,
            counts: JSON.parse(row.counts),
            cases: JSON.parse(row.cases),
        };
        
        // Verify hash
        const { hash, ...rest } = manifest;
        const canonical = this.canonicalizeManifest(rest as Omit<CaseManifest, 'hash'>);
        const computedHash = sha256(canonical).slice(0, 16);
        
        if (computedHash !== hash) {
            throw new Error(`Manifest hash mismatch! Expected ${hash}, got ${computedHash}.`);
        }
        
        this.manifestCache = manifest;
        return manifest;
    }
    
    async writeManifest(manifest: CaseManifest): Promise<void> {
        await this.init();
        
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
        
        this.manifestCache = manifestWithHash;
    }
    
    private canonicalizeManifest(manifest: Omit<CaseManifest, 'hash'>): string {
        const sorted = { ...manifest, cases: [...manifest.cases].sort((a, b) => a.id.localeCompare(b.id)) };
        return JSON.stringify(sorted, null, 2);
    }
    
    private async generateManifest(): Promise<CaseManifest> {
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
    
    async readIntentCases(split: CaseSplit): Promise<IntentCase[]> {
        await this.init();
        
        const rows = this.db.prepare('SELECT content FROM cases WHERE family = ? AND split = ?')
            .all('intent', split) as any[];
        
        const manifest = await this.readManifest();
        
        return rows.map(row => {
            const caseData = JSON.parse(row.content) as IntentCase;
            
            // Verify hash
            const content = JSON.stringify(caseData);
            const computedHash = sha256(content).slice(0, 16);
            const entry = manifest.cases.find(c => c.id === caseData.id);
            if (entry && computedHash !== entry.hash) {
                throw new Error(`Case hash mismatch for ${caseData.id}: expected ${entry.hash}, got ${computedHash}`);
            }
            
            return caseData;
        });
    }
    
    async readQualityCases(qualityFamily: QualityFamily): Promise<QualityCase[]> {
        await this.init();
        
        const rows = this.db.prepare('SELECT content FROM cases WHERE family = ? AND quality_family = ?')
            .all('quality', qualityFamily) as any[];
        
        const manifest = await this.readManifest();
        
        return rows.map(row => {
            const caseData = JSON.parse(row.content) as QualityCase;
            
            // Verify hash
            const content = JSON.stringify(caseData);
            const computedHash = sha256(content).slice(0, 16);
            const entry = manifest.cases.find(c => c.id === caseData.id);
            if (entry && computedHash !== entry.hash) {
                throw new Error(`Case hash mismatch for ${caseData.id}: expected ${entry.hash}, got ${computedHash}`);
            }
            
            return caseData;
        });
    }
    
    async readHoldoutCases(): Promise<IntentCase[]> {
        return this.readIntentCases('holdout');
    }
    
    async readAllCases(): Promise<{ intent: IntentCase[]; quality: QualityCase[] }> {
        await this.init();
        
        const intentRows = this.db.prepare('SELECT content FROM cases WHERE family = ?').all('intent') as any[];
        const qualityRows = this.db.prepare('SELECT content FROM cases WHERE family = ?').all('quality') as any[];
        
        return {
            intent: intentRows.map(r => JSON.parse(r.content) as IntentCase),
            quality: qualityRows.map(r => JSON.parse(r.content) as QualityCase),
        };
    }
    
    async upsertCase(caseData: IntentCase | QualityCase): Promise<void> {
        await this.init();
        
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
        
        this.manifestCache = null;
        await this.readManifest(); // Regenerate
    }
    
    async deleteCase(id: string): Promise<boolean> {
        await this.init();
        
        const result = this.db.prepare('DELETE FROM cases WHERE id = ?').run(id);
        
        if (result.changes > 0) {
            this.manifestCache = null;
            await this.readManifest(); // Regenerate
            return true;
        }
        
        return false;
    }
    
    async verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
        await this.init();
        const errors: string[] = [];
        
        try {
            const manifest = await this.readManifest();
            
            for (const entry of manifest.cases) {
                const row = this.db.prepare('SELECT content FROM cases WHERE id = ?').get(entry.id) as any;
                if (!row) {
                    errors.push(`Case ${entry.id} missing from database`);
                    continue;
                }
                
                const content = row.content;
                const computedHash = sha256(content).slice(0, 16);
                if (computedHash !== entry.hash) {
                    errors.push(`Hash mismatch for ${entry.id}: expected ${entry.hash}, got ${computedHash}`);
                }
            }
        } catch (e) {
            errors.push(`Manifest error: ${e}`);
        }
        
        return { valid: errors.length === 0, errors };
    }
    
    async close(): Promise<void> {
        this.manifestCache = null;
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