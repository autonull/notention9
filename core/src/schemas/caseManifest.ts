/**
 * CaseManifest schema + CaseStore interface (S4)
 * Replaces hardcoded filesystem case manifest with pluggable storage
 */

import { z } from 'zod';
import type { CaseFamily, CaseSplit, QualityFamily, IntentCase, QualityCase, ExtractionExpectation, MatchExpectation } from '../eval/caseManifest.js';

// --- Zod schemas for case types ---

export const extractionExpectationSchema = z.object({
    key: z.string(),
    operator: z.enum(['equals', 'contains', 'less than', 'greater than', 'matches']),
    values: z.array(z.string()),
});

export const matchExpectationSchema = z.object({
    noteId: z.string(),
    minScore: z.number().optional(),
});

export const intentCaseSchema = z.object({
    id: z.string(),
    family: z.literal('intent'),
    intent: z.string(),
    prompt: z.string(),
    seed: z.object({
        notes: z.array(z.unknown()),
        settings: z.record(z.unknown()),
        revisions: z.array(z.string()),
    }),
    expected: z.object({
        minProperties: z.number().optional(),
        requiredKeys: z.array(z.string()).optional(),
        outcome: z.enum(['captured', 'elicited', 'matched', 'rendered']),
        matchMinRecall: z.number().optional(),
        matchMinPrecision: z.number().optional(),
    }),
    metrics: z.array(z.enum(['completion', 'steps', 'corrections', 'recall', 'precision', 'f1'])),
    tags: z.array(z.string()),
    provenance: z.object({
        author: z.enum(['human', 'model']),
        source: z.string(),
    }),
});

export const qualityCaseSchema = z.object({
    id: z.string(),
    family: z.literal('quality'),
    qualityFamily: z.enum(['extraction', 'match']),
    input: z.string(),
    expected: z.union([
        z.array(extractionExpectationSchema),
        z.array(matchExpectationSchema),
    ]),
    forbidden: z.array(extractionExpectationSchema).optional(),
    labels: z.object({
        annotators: z.number(),
        agreement: z.number(),
    }).optional(),
    tags: z.array(z.string()),
});

export const caseEntrySchema = z.object({
    id: z.string(),
    family: z.enum(['intent', 'quality']),
    split: z.enum(['search', 'validation', 'holdout']).optional(),
    qualityFamily: z.enum(['extraction', 'match']).optional(),
    path: z.string(),
    hash: z.string(),
    tags: z.array(z.string()),
});

export const caseManifestSchema = z.object({
    version: z.literal(1),
    hash: z.string(),
    generatedAt: z.string().datetime(),
    counts: z.object({
        intent: z.object({
            search: z.number(),
            validation: z.number(),
            holdout: z.number(),
        }),
        quality: z.object({
            extraction: z.number(),
            match: z.number(),
        }),
    }),
    cases: z.array(caseEntrySchema),
});

// --- Types ---

export type CaseManifest = z.infer<typeof caseManifestSchema>;
export type CaseEntry = z.infer<typeof caseEntrySchema>;

// --- CaseStore Interface (S4) ---

export interface CaseStore {
    /** Initialize the store */
    init(): Promise<void>;
    
    /** Read the manifest */
    readManifest(): Promise<CaseManifest>;
    
    /** Write the manifest */
    writeManifest(manifest: CaseManifest): Promise<void>;
    
    /** Read intent cases for a split */
    readIntentCases(split: CaseSplit): Promise<IntentCase[]>;
    
    /** Read quality cases for a family */
    readQualityCases(qualityFamily: QualityFamily): Promise<QualityCase[]>;
    
    /** Read holdout cases (audit-only) */
    readHoldoutCases(): Promise<IntentCase[]>;
    
    /** Read all cases */
    readAllCases(): Promise<{ intent: IntentCase[]; quality: QualityCase[] }>;
    
    /** Add or update a case */
    upsertCase(caseData: IntentCase | QualityCase): Promise<void>;
    
    /** Delete a case */
    deleteCase(id: string): Promise<boolean>;
    
    /** Verify integrity of all cases */
    verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }>;
    
    /** Close the store */
    close(): Promise<void>;
}

// --- Filesystem Implementation ---

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const DEFAULT_CASES_DIR = join(PROJECT_ROOT, 'eval', 'cases');

function sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

function canonicalizeManifest(manifest: Omit<CaseManifest, 'hash'>): string {
    const sorted = { ...manifest, cases: [...manifest.cases].sort((a, b) => a.id.localeCompare(b.id)) };
    return JSON.stringify(sorted, null, 2);
}

function collectCaseFiles(dir: string, baseDir: string): Array<{ path: string; content: string }> {
    const results: Array<{ path: string; content: string }> = [];
    
    if (!statSync(dir).isDirectory()) return results;
    
    for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
            results.push(...collectCaseFiles(fullPath, baseDir));
        } else if (extname(entry) === '.json') {
            const content = readFileSync(fullPath, 'utf-8');
            const relPath = relative(baseDir, fullPath);
            results.push({ path: relPath, content });
        }
    }
    
    return results;
}

export class FileSystemCaseStore implements CaseStore {
    private casesDir: string;
    private manifestCache: CaseManifest | null = null;
    private initialized = false;
    
    constructor(casesDir: string = DEFAULT_CASES_DIR) {
        this.casesDir = casesDir;
    }
    
    async init(): Promise<void> {
        if (this.initialized) return;
        
        // Ensure directories exist
        const dirs = [
            this.casesDir,
            join(this.casesDir, 'intent', 'search'),
            join(this.casesDir, 'intent', 'validation'),
            join(this.casesDir, 'intent', 'holdout'),
            join(this.casesDir, 'quality', 'extraction'),
            join(this.casesDir, 'quality', 'match'),
        ];
        
        for (const dir of dirs) {
            mkdirSync(dir, { recursive: true });
        }
        
        this.initialized = true;
    }
    
    async readManifest(): Promise<CaseManifest> {
        await this.init();
        
        if (this.manifestCache) return this.manifestCache;
        
        const manifestPath = join(this.casesDir, 'manifest.json');
        if (!statSync(manifestPath, { throwIfNoEntry: false })?.isFile()) {
            // Generate initial manifest
            const manifest = await this.generateManifest();
            await this.writeManifest(manifest);
            return manifest;
        }
        
        const content = readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(content) as CaseManifest;
        
        // Verify hash
        const { hash, ...rest } = manifest;
        const canonical = canonicalizeManifest(rest as Omit<CaseManifest, 'hash'>);
        const computedHash = sha256(canonical).slice(0, 16);
        
        if (computedHash !== hash) {
            throw new Error(`Manifest hash mismatch! Expected ${hash}, got ${computedHash}.`);
        }
        
        this.manifestCache = manifest;
        return manifest;
    }
    
    async writeManifest(manifest: CaseManifest): Promise<void> {
        await this.init();
        const manifestPath = join(this.casesDir, 'manifest.json');
        const canonical = canonicalizeManifest(manifest);
        writeFileSync(manifestPath, canonical, 'utf-8');
        this.manifestCache = manifest;
    }
    
    private async generateManifest(): Promise<CaseManifest> {
        const intentCases: CaseEntry[] = [];
        const qualityCases: CaseEntry[] = [];
        
        // Intent cases
        const intentDir = join(this.casesDir, 'intent');
        const intentFiles = collectCaseFiles(intentDir, this.casesDir);
        
        for (const { path, content } of intentFiles) {
            try {
                const caseData = JSON.parse(content) as IntentCase;
                const split = path.split('/')[1] as CaseSplit;
                
                intentCases.push({
                    id: caseData.id,
                    family: 'intent',
                    split,
                    path,
                    hash: sha256(content).slice(0, 16),
                    tags: caseData.tags,
                });
            } catch (e) {
                console.warn(`Failed to parse intent case ${path}: ${e}`);
            }
        }
        
        // Quality cases
        const qualityDir = join(this.casesDir, 'quality');
        const qualityFiles = collectCaseFiles(qualityDir, this.casesDir);
        
        for (const { path, content } of qualityFiles) {
            try {
                const caseData = JSON.parse(content) as QualityCase;
                const qualityFamily = path.split('/')[1] as QualityFamily;
                
                qualityCases.push({
                    id: caseData.id,
                    family: 'quality',
                    qualityFamily,
                    path,
                    hash: sha256(content).slice(0, 16),
                    tags: caseData.tags,
                });
            } catch (e) {
                console.warn(`Failed to parse quality case ${path}: ${e}`);
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
        
        const canonical = canonicalizeManifest(manifestWithoutHash);
        const manifestHash = sha256(canonical).slice(0, 16);
        
        return {
            ...manifestWithoutHash,
            hash: manifestHash,
        };
    }
    
    async readIntentCases(split: CaseSplit): Promise<IntentCase[]> {
        const manifest = await this.readManifest();
        const entries = manifest.cases.filter(c => c.family === 'intent' && c.split === split);
        
        return entries.map(entry => {
            const fullPath = join(this.casesDir, entry.path);
            const content = readFileSync(fullPath, 'utf-8');
            
            // Verify hash
            const computedHash = sha256(content).slice(0, 16);
            if (computedHash !== entry.hash) {
                throw new Error(`Case hash mismatch for ${entry.path}: expected ${entry.hash}, got ${computedHash}`);
            }
            
            return JSON.parse(content) as IntentCase;
        });
    }
    
    async readQualityCases(qualityFamily: QualityFamily): Promise<QualityCase[]> {
        const manifest = await this.readManifest();
        const entries = manifest.cases.filter(c => c.family === 'quality' && c.qualityFamily === qualityFamily);
        
        return entries.map(entry => {
            const fullPath = join(this.casesDir, entry.path);
            const content = readFileSync(fullPath, 'utf-8');
            
            // Verify hash
            const computedHash = sha256(content).slice(0, 16);
            if (computedHash !== entry.hash) {
                throw new Error(`Case hash mismatch for ${entry.path}: expected ${entry.hash}, got ${computedHash}`);
            }
            
            return JSON.parse(content) as QualityCase;
        });
    }
    
    async readHoldoutCases(): Promise<IntentCase[]> {
        return this.readIntentCases('holdout');
    }
    
    async readAllCases(): Promise<{ intent: IntentCase[]; quality: QualityCase[] }> {
        const manifest = await this.readManifest();
        return {
            intent: [
                ...await this.readIntentCases('search'),
                ...await this.readIntentCases('validation'),
                ...await this.readIntentCases('holdout'),
            ],
            quality: [
                ...await this.readQualityCases('extraction'),
                ...await this.readQualityCases('match'),
            ],
        };
    }
    
    async upsertCase(caseData: IntentCase | QualityCase): Promise<void> {
        await this.init();
        
        let subDir: string;
        if (caseData.family === 'intent') {
            subDir = join(this.casesDir, 'intent', 'search'); // Default to search
        } else {
            subDir = join(this.casesDir, 'quality', caseData.qualityFamily);
        }
        
        const filePath = join(subDir, `${caseData.id}.json`);
        const content = JSON.stringify(caseData, null, 2);
        writeFileSync(filePath, content, 'utf-8');
        
        // Regenerate manifest
        this.manifestCache = null;
        await this.readManifest();
    }
    
    async deleteCase(id: string): Promise<boolean> {
        await this.init();
        const manifest = await this.readManifest();
        const entry = manifest.cases.find(c => c.id === id);
        
        if (!entry) return false;
        
        const filePath = join(this.casesDir, entry.path);
        unlinkSync(filePath);
        
        // Regenerate manifest
        this.manifestCache = null;
        await this.readManifest();
        
        return true;
    }
    
    async verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
        await this.init();
        const errors: string[] = [];
        
        try {
            const manifest = await this.readManifest();
            
            for (const entry of manifest.cases) {
                const fullPath = join(this.casesDir, entry.path);
                try {
                    const content = readFileSync(fullPath, 'utf-8');
                    const computedHash = sha256(content).slice(0, 16);
                    if (computedHash !== entry.hash) {
                        errors.push(`Hash mismatch for ${entry.path}: expected ${entry.hash}, got ${computedHash}`);
                    }
                } catch (e) {
                    errors.push(`Failed to read ${entry.path}: ${e}`);
                }
            }
        } catch (e) {
            errors.push(`Manifest error: ${e}`);
        }
        
        return { valid: errors.length === 0, errors };
    }
    
    async close(): Promise<void> {
        this.manifestCache = null;
        this.initialized = false;
    }
}

// --- In-Memory Implementation (for testing) ---

export class InMemoryCaseStore implements CaseStore {
    private cases: Map<string, IntentCase | QualityCase> = new Map();
    private manifest: CaseManifest | null = null;
    
    async init(): Promise<void> {}
    
    async readManifest(): Promise<CaseManifest> {
        if (this.manifest) return this.manifest;
        
        const intentCases: CaseEntry[] = [];
        const qualityCases: CaseEntry[] = [];
        
        for (const [id, caseData] of this.cases) {
            if (caseData.family === 'intent') {
                intentCases.push({
                    id,
                    family: 'intent',
                    split: 'search',
                    path: `intent/search/${id}.json`,
                    hash: sha256(JSON.stringify(caseData)).slice(0, 16),
                    tags: caseData.tags,
                });
            } else {
                qualityCases.push({
                    id,
                    family: 'quality',
                    qualityFamily: caseData.qualityFamily,
                    path: `quality/${caseData.qualityFamily}/${id}.json`,
                    hash: sha256(JSON.stringify(caseData)).slice(0, 16),
                    tags: caseData.tags,
                });
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
        
        const canonical = canonicalizeManifest(manifestWithoutHash);
        const manifestHash = sha256(canonical).slice(0, 16);
        
        this.manifest = { ...manifestWithoutHash, hash: manifestHash };
        return this.manifest;
    }
    
    async writeManifest(manifest: CaseManifest): Promise<void> {
        this.manifest = manifest;
    }
    
    async readIntentCases(split: CaseSplit): Promise<IntentCase[]> {
        const results: IntentCase[] = [];
        for (const [id, caseData] of this.cases) {
            if (caseData.family === 'intent') {
                results.push(caseData);
            }
        }
        return results;
    }
    
    async readQualityCases(qualityFamily: QualityFamily): Promise<QualityCase[]> {
        const results: QualityCase[] = [];
        for (const [id, caseData] of this.cases) {
            if (caseData.family === 'quality' && caseData.qualityFamily === qualityFamily) {
                results.push(caseData);
            }
        }
        return results;
    }
    
    async readHoldoutCases(): Promise<IntentCase[]> {
        return this.readIntentCases('holdout');
    }
    
    async readAllCases(): Promise<{ intent: IntentCase[]; quality: QualityCase[] }> {
        const intent: IntentCase[] = [];
        const quality: QualityCase[] = [];
        
        for (const [id, caseData] of this.cases) {
            if (caseData.family === 'intent') {
                intent.push(caseData);
            } else {
                quality.push(caseData);
            }
        }
        
        return { intent, quality };
    }
    
    async upsertCase(caseData: IntentCase | QualityCase): Promise<void> {
        this.cases.set(caseData.id, caseData);
        this.manifest = null;
    }
    
    async deleteCase(id: string): Promise<boolean> {
        const deleted = this.cases.delete(id);
        if (deleted) this.manifest = null;
        return deleted;
    }
    
    async verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
        return { valid: true, errors: [] };
    }
    
    async close(): Promise<void> {
        this.cases.clear();
        this.manifest = null;
    }
}