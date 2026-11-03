/**
 * Shared Case Manifest Utilities
 * Eliminates duplication between FileSystemCaseStore and InMemoryCaseStore
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

/** SHA-256 hash function */
export function sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

/** Canonicalize manifest for consistent hashing */
export function canonicalizeManifest(manifest: Omit<CaseManifest, 'hash'>): string {
    const sorted = { ...manifest, cases: [...manifest.cases].sort((a, b) => a.id.localeCompare(b.id)) };
    return JSON.stringify(sorted, null, 2);
}

/** Compute manifest hash from manifest without hash */
export function computeManifestHash(manifestWithoutHash: Omit<CaseManifest, 'hash'>): string {
    const canonical = canonicalizeManifest(manifestWithoutHash);
    return sha256(canonical).slice(0, 16);
}

/** Build CaseEntry from IntentCase */
export function buildIntentCaseEntry(caseData: IntentCase, split: CaseSplit, relativePath: string): CaseEntry {
    const content = JSON.stringify(caseData);
    return {
        id: caseData.id,
        family: 'intent',
        split,
        path: relativePath,
        hash: sha256(content).slice(0, 16),
        tags: caseData.tags,
    };
}

/** Build CaseEntry from QualityCase */
export function buildQualityCaseEntry(caseData: QualityCase, qualityFamily: QualityFamily, relativePath: string): CaseEntry {
    const content = JSON.stringify(caseData);
    return {
        id: caseData.id,
        family: 'quality',
        qualityFamily,
        path: relativePath,
        hash: sha256(content).slice(0, 16),
        tags: caseData.tags,
    };
}

/** Generate manifest from cases */
export function generateManifestFromCases(
    intentCases: CaseEntry[],
    qualityCases: CaseEntry[]
): CaseManifest {
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
    
    return {
        ...manifestWithoutHash,
        hash: computeManifestHash(manifestWithoutHash),
    };
}

/** Verify case hash against manifest entry */
export function verifyCaseHash(content: string, expectedHash: string): boolean {
    const computedHash = sha256(content).slice(0, 16);
    return computedHash === expectedHash;
}

/** Create manifest entry for upserted case */
export function createManifestEntryForCase(caseData: IntentCase | QualityCase, casesDir: string): CaseEntry {
    if (caseData.family === 'intent') {
        const relativePath = `intent/search/${caseData.id}.json`;
        return buildIntentCaseEntry(caseData, 'search', relativePath);
    } else {
        const relativePath = `quality/${caseData.qualityFamily}/${caseData.id}.json`;
        return buildQualityCaseEntry(caseData, caseData.qualityFamily, relativePath);
    }
}

/** Collect case files recursively from a directory */
export function collectCaseFiles(dir: string, baseDir: string): Array<{ path: string; content: string }> {
    const { readdirSync, statSync, readFileSync, existsSync, join } = require('node:fs');
    const { extname, relative } = require('node:path');
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