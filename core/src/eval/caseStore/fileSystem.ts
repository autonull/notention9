/**
 * FileSystem CaseStore Implementation
 * Extracted from schemas/caseManifest.ts for modularity
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import type { 
    CaseManifest, 
    CaseEntry, 
    IntentCase, 
    QualityCase, 
    CaseSplit, 
    QualityFamily 
} from '../../schemas/caseTypes.js';
import type { CaseStore } from '../../schemas/sharedTypes.js';
import { logWarn } from '../../utils/logging.js';
import { 
    sha256, 
    canonicalizeManifest, 
    computeManifestHash, 
    generateManifestFromCases,
    buildIntentCaseEntry,
    buildQualityCaseEntry,
    verifyCaseHash,
    collectCaseFiles,
    getProjectRoot,
} from './manifestUtils.js';

const PROJECT_ROOT = getProjectRoot(import.meta.url);
const DEFAULT_CASES_DIR = join(PROJECT_ROOT, 'eval', 'cases');

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
        const computedHash = computeManifestHash(rest as Omit<CaseManifest, 'hash'>);
        
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
    
    // Re-export collectCaseFiles for use in manifestUtils (but it's local to this file)
    // We'll move it to manifestUtils if needed
    
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
                
                intentCases.push(buildIntentCaseEntry(caseData, split, path));
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
                
                qualityCases.push(buildQualityCaseEntry(caseData, qualityFamily, path));
            } catch (e) {
                logWarn(`Failed to parse quality case`, { path, error: e instanceof Error ? e.message : String(e) });
            }
        }
        
        return generateManifestFromCases(intentCases, qualityCases);
    }
    
    async readIntentCases(split: CaseSplit): Promise<IntentCase[]> {
        const manifest = await this.readManifest();
        const entries = manifest.cases.filter(c => c.family === 'intent' && c.split === split);
        
        return entries.map(entry => {
            const fullPath = join(this.casesDir, entry.path);
            const content = readFileSync(fullPath, 'utf-8');
            
            // Verify hash using shared utility
            if (!verifyCaseHash(content, entry.hash)) {
                throw new Error(`Case hash mismatch for ${entry.path}: expected ${entry.hash}`);
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
            
            // Verify hash using shared utility
            if (!verifyCaseHash(content, entry.hash)) {
                throw new Error(`Case hash mismatch for ${entry.path}: expected ${entry.hash}`);
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
    
    // Re-export collectCaseFiles for use in manifestUtils
    
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
                    if (!verifyCaseHash(content, entry.hash)) {
                        errors.push(`Hash mismatch for ${entry.path}: expected ${entry.hash}`);
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