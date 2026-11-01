/**
 * Case Manifest — content-addressable evaluation case registry
 * Single source of truth for case membership and integrity
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const CASES_DIR = join(PROJECT_ROOT, 'eval', 'cases');

export type CaseFamily = 'intent' | 'quality';
export type CaseSplit = 'search' | 'validation' | 'holdout';
export type QualityFamily = 'extraction' | 'match';

export interface CaseManifest {
    version: 1;
    hash: string;              // SHA-256 of canonical manifest (first 16 chars)
    generatedAt: string;       // ISO timestamp
    counts: {
        intent: { search: number; validation: number; holdout: number };
        quality: { extraction: number; match: number };
    };
    cases: CaseEntry[];
}

export interface CaseEntry {
    id: string;
    family: CaseFamily;
    split?: CaseSplit;         // only for intent
    qualityFamily?: QualityFamily; // only for quality
    path: string;              // relative to eval/cases/
    hash: string;              // SHA-256 of case file (first 16 chars)
    tags: string[];
}

export interface IntentCase {
    id: string;
    family: 'intent';
    intent: string;            // e.g., 'capture_need', 'elicit_property', 'match_local', 'layout_property'
    prompt: string;
    seed: {
        notes: any[];
        settings: Record<string, any>;
        revisions: string[];   // revision IDs to apply, 'incumbent' = current active
    };
    expected: {
        minProperties?: number;
        requiredKeys?: string[];
        outcome: 'captured' | 'elicited' | 'matched' | 'rendered';
        matchMinRecall?: number;
        matchMinPrecision?: number;
    };
    metrics: ('completion' | 'steps' | 'corrections' | 'recall' | 'precision' | 'f1')[];
    tags: string[];
    provenance: {
        author: 'human' | 'model';
        source: string;
    };
}

export interface QualityCase {
    id: string;
    family: 'quality';
    qualityFamily: QualityFamily;
    input: string;
    expected: ExtractionExpectation[] | MatchExpectation[];
    forbidden?: ExtractionExpectation[];
    labels?: {
        annotators: number;
        agreement: number;     // Cohen's kappa or similar
    };
    tags: string[];
}

export type ExtractionExpectation = {
    key: string;
    operator: 'equals' | 'contains' | 'less than' | 'greater than' | 'matches';
    values: string[];
};

export type MatchExpectation = {
    noteId: string;
    minScore?: number;
};

// --- Manifest generation ---

function sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

function canonicalizeManifest(manifest: Omit<CaseManifest, 'hash'>): string {
    // Sort cases by id for deterministic output
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

export function generateManifest(): CaseManifest {
    const intentCases: CaseEntry[] = [];
    const qualityCases: CaseEntry[] = [];
    
    // Intent cases
    const intentDir = join(CASES_DIR, 'intent');
    const intentFiles = collectCaseFiles(intentDir, CASES_DIR);
    
    for (const { path, content } of intentFiles) {
        try {
            const caseData = JSON.parse(content) as IntentCase;
            const split = path.split('/')[1] as CaseSplit; // intent/search/xxx.json
            
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
    const qualityDir = join(CASES_DIR, 'quality');
    const qualityFiles = collectCaseFiles(qualityDir, CASES_DIR);
    
    for (const { path, content } of qualityFiles) {
        try {
            const caseData = JSON.parse(content) as QualityCase;
            const qualityFamily = path.split('/')[1] as QualityFamily; // quality/extraction/xxx.json
            
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

export function writeManifest(manifest: CaseManifest): void {
    const manifestPath = join(CASES_DIR, 'manifest.json');
    const canonical = canonicalizeManifest(manifest);
    writeFileSync(manifestPath, canonical, 'utf-8');
}

export function readManifest(): CaseManifest {
    const manifestPath = join(CASES_DIR, 'manifest.json');
    const content = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as CaseManifest;
    
    // Verify hash
    const { hash, ...rest } = manifest;
    const canonical = canonicalizeManifest(rest as Omit<CaseManifest, 'hash'>);
    const computedHash = sha256(canonical).slice(0, 16);
    
    if (computedHash !== hash) {
        throw new Error(`Manifest hash mismatch! Expected ${hash}, got ${computedHash}. Run 'pnpm eval:update-manifest' to regenerate.`);
    }
    
    return manifest;
}

export function verifyManifest(): { valid: boolean; error?: string } {
    try {
        readManifest();
        return { valid: true };
    } catch (e) {
        return { valid: false, error: e instanceof Error ? e.message : String(e) };
    }
}

// --- Case readers (enforce splits) ---

export function readIntentCases(split: CaseSplit, manifest?: CaseManifest): IntentCase[] {
    const m = manifest ?? readManifest();
    const entries = m.cases.filter(c => c.family === 'intent' && c.split === split);
    
    return entries.map(entry => {
        const fullPath = join(CASES_DIR, entry.path);
        const content = readFileSync(fullPath, 'utf-8');
        
        // Verify hash
        const computedHash = sha256(content).slice(0, 16);
        if (computedHash !== entry.hash) {
            throw new Error(`Case hash mismatch for ${entry.path}: expected ${entry.hash}, got ${computedHash}`);
        }
        
        return JSON.parse(content) as IntentCase;
    });
}

export function readQualityCases(qualityFamily: QualityFamily, manifest?: CaseManifest): QualityCase[] {
    const m = manifest ?? readManifest();
    const entries = m.cases.filter(c => c.family === 'quality' && c.qualityFamily === qualityFamily);
    
    return entries.map(entry => {
        const fullPath = join(CASES_DIR, entry.path);
        const content = readFileSync(fullPath, 'utf-8');
        
        // Verify hash
        const computedHash = sha256(content).slice(0, 16);
        if (computedHash !== entry.hash) {
            throw new Error(`Case hash mismatch for ${entry.path}: expected ${entry.hash}, got ${computedHash}`);
        }
        
        return JSON.parse(content) as QualityCase;
    });
}

export function readHoldoutCases(manifest?: CaseManifest): IntentCase[] {
    // Audit-only access to holdout
    return readIntentCases('holdout', manifest);
}

export function readAllCases(manifest?: CaseManifest): { intent: IntentCase[]; quality: QualityCase[] } {
    const m = manifest ?? readManifest();
    return {
        intent: [
            ...readIntentCases('search', m),
            ...readIntentCases('validation', m),
            ...readIntentCases('holdout', m),
        ],
        quality: [
            ...readQualityCases('extraction', m),
            ...readQualityCases('match', m),
        ],
    };
}