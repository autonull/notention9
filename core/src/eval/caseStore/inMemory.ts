/**
 * In-Memory CaseStore Implementation
 * For testing and ephemeral use cases
 */

import type { 
    CaseManifest, 
    CaseEntry, 
    IntentCase, 
    QualityCase, 
    CaseSplit, 
    QualityFamily 
} from '../../schemas/caseTypes.js';
import { 
    canonicalizeManifest, 
    computeManifestHash, 
    generateManifestFromCases,
    buildIntentCaseEntry,
    buildQualityCaseEntry 
} from './manifestUtils.js';
import { BaseCaseStore } from './baseCaseStore.js';

export class InMemoryCaseStore extends BaseCaseStore {
    private cases: Map<string, IntentCase | QualityCase> = new Map();
    
    constructor() {
        super();
        // In-memory store doesn't need manifest caching
        this.config.manifestCacheEnabled = false;
    }
    
    protected async doInit(): Promise<void> {}
    
    protected async loadManifest(): Promise<CaseManifest> {
        const intentCases: CaseEntry[] = [];
        const qualityCases: CaseEntry[] = [];
        
        for (const [id, caseData] of this.cases) {
            if (caseData.family === 'intent') {
                intentCases.push(buildIntentCaseEntry(caseData, 'search', `intent/search/${id}.json`));
            } else {
                qualityCases.push(buildQualityCaseEntry(caseData, caseData.qualityFamily, `quality/${caseData.qualityFamily}/${id}.json`));
            }
        }
        
        return generateManifestFromCases(intentCases, qualityCases);
    }
    
    protected async persistManifest(manifest: CaseManifest): Promise<void> {
        // No-op for in-memory
    }
    
    protected async loadIntentCases(split: CaseSplit): Promise<IntentCase[]> {
        const results: IntentCase[] = [];
        for (const [id, caseData] of this.cases) {
            if (caseData.family === 'intent') {
                results.push(caseData);
            }
        }
        return results;
    }
    
    protected async loadQualityCases(qualityFamily: QualityFamily): Promise<QualityCase[]> {
        const results: QualityCase[] = [];
        for (const [id, caseData] of this.cases) {
            if (caseData.family === 'quality' && caseData.qualityFamily === qualityFamily) {
                results.push(caseData);
            }
        }
        return results;
    }
    
    protected async loadCaseById(id: string): Promise<IntentCase | QualityCase | null> {
        return this.cases.get(id) ?? null;
    }
    
    protected async storeCase(caseData: IntentCase | QualityCase): Promise<void> {
        this.cases.set(caseData.id, caseData);
    }
    
    protected async removeCase(id: string): Promise<boolean> {
        return this.cases.delete(id);
    }
    
    async verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
        return { valid: true, errors: [] };
    }
    
    // --- Test helpers ---
    
    /** Clear all cases (for test isolation) */
    clear(): void {
        this.cases.clear();
    }
    
    /** Get case count */
    size(): number {
        return this.cases.size;
    }
    
    /** Check if case exists */
    has(id: string): boolean {
        return this.cases.has(id);
    }
    
    protected async doClose(): Promise<void> {
        this.cases.clear();
    }
}