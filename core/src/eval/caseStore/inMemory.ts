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
import type { CaseStore } from '../../schemas/caseManifest.js';

function sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

function canonicalizeManifest(manifest: Omit<CaseManifest, 'hash'>): string {
    const sorted = { ...manifest, cases: [...manifest.cases].sort((a, b) => a.id.localeCompare(b.id)) };
    return JSON.stringify(sorted, null, 2);
}

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