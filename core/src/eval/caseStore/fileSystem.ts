/**
 * FileSystem CaseStore Implementation
 * Extracted from schemas/caseManifest.ts for modularity
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { 
    CaseManifest, 
    CaseEntry, 
    IntentCase, 
    QualityCase, 
    CaseSplit, 
    QualityFamily 
} from '../caseManifest.js';
import type { CaseStore } from '../../schemas/caseManifest.js';
import { logWarn } from '../../utils/logging.js';

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
    
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return results;
    
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
        if (!existsSync(manifestPath)) {
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
                logWarn(`Failed to parse intent case`, { path, error: e instanceof Error ? e.message : String(e) });
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
                logWarn(`Failed to parse quality case`, { path, error: e instanceof Error ? e.message : String(e) });
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
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }
        
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