/**
 * In-Memory CaseStore Implementation
 * For testing and ephemeral use cases
 */

import { createHash } from 'node:crypto';
import type { 
    CaseManifest, 
    CaseEntry, 
    IntentCase, 
    QualityCase, 
    CaseSplit, 
    QualityFamily 
} from '../../schemas/caseTypes.js';
import type { CaseStore } from '../../schemas/sharedTypes.js';
import { 
    sha256, 
    canonicalizeManifest, 
    computeManifestHash, 
    generateManifestFromCases,
    buildIntentCaseEntry,
    buildQualityCaseEntry 
} from './manifestUtils.js';

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
                intentCases.push(buildIntentCaseEntry(caseData, 'search', `intent/search/${id}.json`));
            } else {
                qualityCases.push(buildQualityCaseEntry(caseData, caseData.qualityFamily, `quality/${caseData.qualityFamily}/${id}.json`));
            }
        }
        
        this.manifest = generateManifestFromCases(intentCases, qualityCases);
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
    
    // --- Test helpers ---
    
    /** Clear all cases (for test isolation) */
    clear(): void {
        this.cases.clear();
        this.manifest = null;
    }
    
    /** Get case count */
    size(): number {
        return this.cases.size;
    }
    
    /** Check if case exists */
    has(id: string): boolean {
        return this.cases.has(id);
    }
}