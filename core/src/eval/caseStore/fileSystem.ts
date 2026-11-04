/**
 * FileSystem CaseStore Implementation
 * Extracted from schemas/caseManifest.ts for modularity
 */

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
import { logWarn } from '../../utils/logging.js';
import { 
    collectCaseFiles,
    getProjectRoot,
    canonicalizeManifest,
} from './manifestUtils.js';
import { BaseCaseStore } from './baseCaseStore.js';

const PROJECT_ROOT = getProjectRoot(import.meta.url);
const DEFAULT_CASES_DIR = join(PROJECT_ROOT, 'eval', 'cases');

export class FileSystemCaseStore extends BaseCaseStore {
    private casesDir: string;
    
    constructor(casesDir: string = DEFAULT_CASES_DIR) {
        super();
        this.casesDir = casesDir;
    }
    
    protected async doInit(): Promise<void> {
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
    }
    
    protected async loadManifest(): Promise<CaseManifest> {
        const manifestPath = join(this.casesDir, 'manifest.json');
        if (!existsSync(manifestPath)) {
            return this.generateManifest();
        }
        
        const content = readFileSync(manifestPath, 'utf-8');
        return JSON.parse(content) as CaseManifest;
    }
    
    protected async persistManifest(manifest: CaseManifest): Promise<void> {
        const manifestPath = join(this.casesDir, 'manifest.json');
        const canonical = canonicalizeManifest(manifest);
        writeFileSync(manifestPath, canonical, 'utf-8');
    }
    
    protected async loadIntentCases(split: CaseSplit): Promise<IntentCase[]> {
        const manifest = await this.readManifest();
        const entries = manifest.cases.filter(c => c.family === 'intent' && c.split === split);
        
        return entries.map(entry => {
            const fullPath = join(this.casesDir, entry.path);
            const content = readFileSync(fullPath, 'utf-8');
            return JSON.parse(content) as IntentCase;
        });
    }
    
    protected async loadQualityCases(qualityFamily: QualityFamily): Promise<QualityCase[]> {
        const manifest = await this.readManifest();
        const entries = manifest.cases.filter(c => c.family === 'quality' && c.qualityFamily === qualityFamily);
        
        return entries.map(entry => {
            const fullPath = join(this.casesDir, entry.path);
            const content = readFileSync(fullPath, 'utf-8');
            return JSON.parse(content) as QualityCase;
        });
    }
    
    protected async loadCaseById(id: string): Promise<IntentCase | QualityCase | null> {
        const manifest = await this.readManifest();
        const entry = manifest.cases.find(c => c.id === id);
        if (!entry) return null;
        
        const fullPath = join(this.casesDir, entry.path);
        if (!existsSync(fullPath)) return null;
        
        const content = readFileSync(fullPath, 'utf-8');
        return JSON.parse(content) as IntentCase | QualityCase;
    }
    
    protected async storeCase(caseData: IntentCase | QualityCase): Promise<void> {
        let subDir: string;
        if (caseData.family === 'intent') {
            subDir = join(this.casesDir, 'intent', 'search'); // Default to search
        } else {
            subDir = join(this.casesDir, 'quality', caseData.qualityFamily);
        }
        
        const filePath = join(subDir, `${caseData.id}.json`);
        const content = JSON.stringify(caseData, null, 2);
        writeFileSync(filePath, content, 'utf-8');
    }
    
    protected async removeCase(id: string): Promise<boolean> {
        const manifest = await this.readManifest();
        const entry = manifest.cases.find(c => c.id === id);
        
        if (!entry) return false;
        
        const filePath = join(this.casesDir, entry.path);
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }
        
        return true;
    }
    
    // Override generateManifest to use filesystem-specific logic
    protected async generateManifest(): Promise<CaseManifest> {
        const { collectCaseFiles, buildIntentCaseEntry, buildQualityCaseEntry, generateManifestFromCases } = await import('./manifestUtils.js');
        
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
}