/**
 * Base CaseStore Plugin
 * Shared base class for all case store implementations
 */

import type { 
    CaseManifest, 
    CaseEntry, 
    IntentCase, 
    QualityCase, 
    CaseSplit, 
    QualityFamily 
} from '../../schemas/caseTypes.js';
import type { CaseStore } from '../../schemas/sharedTypes.js';
import { sha256, canonicalizeManifest, computeManifestHash, generateManifestFromCases, buildIntentCaseEntry, buildQualityCaseEntry, verifyCaseHash } from './manifestUtils.js';

/** Manifest without hash - for computing hash */
type ManifestWithoutHash = Omit<CaseManifest, 'hash'>;

/** Function to verify case content hash */
type HashVerifier = (content: string, expectedHash: string) => boolean;

/** Base configuration for case stores */
export interface BaseCaseStoreConfig {
    manifestCacheEnabled?: boolean;
}

export abstract class BaseCaseStore implements CaseStore {
    protected manifestCache: CaseManifest | null = null;
    protected initialized = false;
    protected config: BaseCaseStoreConfig = { manifestCacheEnabled: true };

    async init(): Promise<void> {
        if (this.initialized) return;
        await this.doInit();
        this.initialized = true;
    }

    /** Override for store-specific initialization */
    protected async doInit(): Promise<void> {}

    async readManifest(): Promise<CaseManifest> {
        await this.init();

        if (this.config.manifestCacheEnabled && this.manifestCache) {
            return this.manifestCache;
        }

        const manifest = await this.loadManifest();
        
        // Verify hash
        const { hash, ...rest } = manifest;
        const computedHash = computeManifestHash(rest as ManifestWithoutHash);
        
        if (computedHash !== hash) {
            throw new Error(`Manifest hash mismatch! Expected ${hash}, got ${computedHash}.`);
        }

        if (this.config.manifestCacheEnabled) {
            this.manifestCache = manifest;
        }
        
        return manifest;
    }

    /** Load manifest from storage (override for each store) */
    protected abstract loadManifest(): Promise<CaseManifest>;

    async writeManifest(manifest: CaseManifest): Promise<void> {
        await this.init();
        await this.persistManifest(manifest);
        
        if (this.config.manifestCacheEnabled) {
            this.manifestCache = manifest;
        }
    }

    /** Persist manifest to storage (override for each store) */
    protected abstract persistManifest(manifest: CaseManifest): Promise<void>;

    /** Generate manifest from cases (can be shared) */
    protected async generateManifest(): Promise<CaseManifest> {
        const { intent, quality } = await this.readAllCases();
        
        const intentEntries = intent.map((c, i) => buildIntentCaseEntry(
            c, 
            (c as any).split || 'search', 
            `intent/search/${c.id}.json`
        ));
        
        const qualityEntries = quality.map(c => buildQualityCaseEntry(
            c, 
            c.qualityFamily, 
            `quality/${c.qualityFamily}/${c.id}.json`
        ));
        
        return generateManifestFromCases(intentEntries, qualityEntries);
    }

    async readIntentCases(split: CaseSplit): Promise<IntentCase[]> {
        const cases = await this.loadIntentCases(split);
        
        // Verify hashes if verifier is available
        const manifest = await this.readManifest();
        return this.verifyCases(cases, manifest, 'intent', split);
    }

    /** Load intent cases from storage (override for each store) */
    protected abstract loadIntentCases(split: CaseSplit): Promise<IntentCase[]>;

    async readQualityCases(qualityFamily: QualityFamily): Promise<QualityCase[]> {
        const cases = await this.loadQualityCases(qualityFamily);
        
        const manifest = await this.readManifest();
        return this.verifyCases(cases, manifest, 'quality', qualityFamily);
    }

    /** Load quality cases from storage (override for each store) */
    protected abstract loadQualityCases(qualityFamily: QualityFamily): Promise<QualityCase[]>;

    async readHoldoutCases(): Promise<IntentCase[]> {
        return this.readIntentCases('holdout');
    }

    async readAllCases(): Promise<{ intent: IntentCase[]; quality: QualityCase[] }> {
        const manifest = await this.readManifest();
        
        const intentCases: IntentCase[] = [];
        const qualityCases: QualityCase[] = [];
        
        for (const entry of manifest.cases) {
            if (entry.family === 'intent') {
                const caseData = await this.loadCaseById(entry.id);
                if (caseData && caseData.family === 'intent') {
                    intentCases.push(caseData);
                }
            } else {
                const caseData = await this.loadCaseById(entry.id);
                if (caseData && caseData.family === 'quality') {
                    qualityCases.push(caseData);
                }
            }
        }
        
        return { intent: intentCases, quality: qualityCases };
    }

    /** Load single case by ID (override for each store) */
    protected abstract loadCaseById(id: string): Promise<IntentCase | QualityCase | null>;

    /** Verify cases against manifest (shared hash verification) */
    protected verifyCases<T extends IntentCase | QualityCase>(
        cases: T[],
        manifest: CaseManifest,
        family: 'intent' | 'quality',
        filter: string
    ): T[] {
        const manifestEntries = manifest.cases.filter(c => 
            c.family === family && 
            (family === 'intent' ? c.split === filter : c.qualityFamily === filter)
        );
        
        // Build lookup map for expected hashes
        const expectedHashes = new Map(manifestEntries.map(e => [e.id, e.hash]));
        
        return cases.filter(caseData => {
            const expectedHash = expectedHashes.get(caseData.id);
            if (!expectedHash) return true; // Not in manifest, skip verification
            
            const content = JSON.stringify(caseData);
            return verifyCaseHash(content, expectedHash);
        });
    }

    async upsertCase(caseData: IntentCase | QualityCase): Promise<void> {
        await this.init();
        await this.storeCase(caseData);
        
        // Invalidate manifest cache
        this.manifestCache = null;
        await this.readManifest(); // Regenerate
    }

    /** Store case to storage (override for each store) */
    protected abstract storeCase(caseData: IntentCase | QualityCase): Promise<void>;

    async deleteCase(id: string): Promise<boolean> {
        await this.init();
        const deleted = await this.removeCase(id);
        
        if (deleted) {
            this.manifestCache = null;
            await this.readManifest(); // Regenerate
        }
        
        return deleted;
    }

    /** Remove case from storage (override for each store) */
    protected abstract removeCase(id: string): Promise<boolean>;

    async verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
        await this.init();
        const errors: string[] = [];
        
        try {
            const manifest = await this.readManifest();
            
            for (const entry of manifest.cases) {
                try {
                    const caseData = await this.loadCaseById(entry.id);
                    if (!caseData) {
                        errors.push(`Case ${entry.id} missing from storage`);
                        continue;
                    }
                    
                    const content = JSON.stringify(caseData);
                    if (!verifyCaseHash(content, entry.hash)) {
                        errors.push(`Hash mismatch for ${entry.id}: expected ${entry.hash}`);
                    }
                } catch (e) {
                    errors.push(`Failed to verify ${entry.id}: ${e}`);
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
        await this.doClose();
    }

    /** Store-specific cleanup */
    protected async doClose(): Promise<void> {}
}