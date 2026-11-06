import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashPatch } from '../candidates/index.js';
import type { CandidateEvaluation } from '../types/index.js';
import { getCacheDir } from '../constants.js';

/**
 * Create a singleton instance with get/reset functions
 */
function createSingleton<T>(factory: () => T): { get(): T; reset(): void } {
    let instance: T | null = null;

    return {
        get(): T {
            if (!instance) {
                instance = factory();
            }
            return instance;
        },
        reset(): void {
            instance = null;
        },
    };
}

/**
 * Candidate cache entry
 */
export interface CandidateCacheEntry {
    candidateId: string;
    patchHash: string;
    evaluation: CandidateEvaluation;
    cachedAt: string;
}

/**
 * Candidate cache - keyed by (target, patchHash) to avoid re-evaluation
 */
export class CandidateCache {
    private cache = new Map<string, CandidateCacheEntry>();
    private readonly cacheDir: string;

    constructor(cacheDir: string = getCacheDir()) {
        this.cacheDir = cacheDir;
        this.loadFromDisk();
    }

    private getKey(seamRole: string, strategyId: string, patchHash: string): string {
        return `${seamRole}:${strategyId}:${patchHash}`;
    }

    get(seamRole: string, strategyId: string, patch: Record<string, unknown>): CandidateEvaluation | undefined {
        const patchHash = hashPatch(patch);
        const key = this.getKey(seamRole, strategyId, patchHash);
        return this.cache.get(key)?.evaluation;
    }

    set(seamRole: string, strategyId: string, patch: Record<string, unknown>, evaluation: CandidateEvaluation): void {
        const patchHash = hashPatch(patch);
        const key = this.getKey(seamRole, strategyId, patchHash);
        const entry: CandidateCacheEntry = {
            candidateId: evaluation.candidateId,
            patchHash,
            evaluation,
            cachedAt: new Date().toISOString(),
        };
        this.cache.set(key, entry);
        this.persistToDisk();
    }

    has(seamRole: string, strategyId: string, patch: Record<string, unknown>): boolean {
        const patchHash = hashPatch(patch);
        const key = this.getKey(seamRole, strategyId, patchHash);
        return this.cache.has(key);
    }

    private persistToDisk(): void {
        if (!existsSync(this.cacheDir)) {
            mkdirSync(this.cacheDir, { recursive: true });
        }
        const data = Array.from(this.cache.entries()).map(([key, entry]) => ({ key, ...entry }));
        writeFileSync(join(this.cacheDir, 'candidate-cache.json'), JSON.stringify(data, null, 2));
    }

    private loadFromDisk(): void {
        const cacheFile = join(this.cacheDir, 'candidate-cache.json');
        if (!existsSync(cacheFile)) return;
        try {
            const data = JSON.parse(readFileSync(cacheFile, 'utf-8')) as Array<{ key: string } & CandidateCacheEntry>;
            for (const item of data) {
                const { key, ...entry } = item;
                this.cache.set(key, entry);
            }
        } catch {
            // Ignore corrupt cache
        }
    }

    clear(): void {
        this.cache.clear();
        const cacheFile = join(this.cacheDir, 'candidate-cache.json');
        if (existsSync(cacheFile)) {
            writeFileSync(cacheFile, '[]');
        }
    }

    get size(): number {
        return this.cache.size;
    }
}

// --- Global candidate cache instance ---
const { get: getCandidateCacheInstance, reset: resetCandidateCacheInstance } = createSingleton(() => new CandidateCache());

export function getCandidateCache(): CandidateCache {
    return getCandidateCacheInstance();
}

export function resetCandidateCache(): void {
    resetCandidateCacheInstance();
}