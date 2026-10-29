import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Determinism module (L20) - pinned models, cached outputs, replay
 */

export interface ModelPin {
    modelId: string;
    version: string;
    provider: 'local-model' | 'remote' | 'heuristic';
    pinnedAt: string;
    hash: string;
}

export interface CacheEntry<T> {
    key: string;
    value: T;
    modelPin: ModelPin;
    createdAt: string;
    hits: number;
}

export interface ReplayRecord {
    id: string;
    timestamp: string;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    modelPins: ModelPin[];
    configHash: string;
    resultHash: string;
}

/**
 * Model pinning - ensures consistent model versions across runs
 */
export class ModelPinner {
    private pins = new Map<string, ModelPin>();
    private pinsFile: string;

    constructor(pinsFile: string = 'loop/model-pins.json') {
        this.pinsFile = pinsFile;
        this.load();
    }

    private load(): void {
        if (existsSync(this.pinsFile)) {
            try {
                const content = readFileSync(this.pinsFile, 'utf-8');
                const pins = JSON.parse(content);
                for (const [key, pin] of Object.entries(pins)) {
                    this.pins.set(key, pin as ModelPin);
                }
            } catch {
                // Ignore corrupt file
            }
        }
    }

    private save(): void {
        mkdirSync(dirname(this.pinsFile), { recursive: true });
        const obj = Object.fromEntries(this.pins);
        writeFileSync(this.pinsFile, JSON.stringify(obj, null, 2));
    }

    pinModel(modelId: string, version: string, provider: ModelPin['provider']): ModelPin {
        const pin: ModelPin = {
            modelId,
            version,
            provider,
            pinnedAt: new Date().toISOString(),
            hash: createHash('sha256').update(`${modelId}@${version}`).digest('hex').slice(0, 16),
        };
        this.pins.set(`${provider}:${modelId}`, pin);
        this.save();
        return pin;
    }

    getPin(modelId: string, provider: ModelPin['provider']): ModelPin | undefined {
        return this.pins.get(`${provider}:${modelId}`);
    }

    getAllPins(): ModelPin[] {
        return Array.from(this.pins.values());
    }

    verifyPins(expected: ModelPin[]): boolean {
        for (const expectedPin of expected) {
            const actual = this.pins.get(`${expectedPin.provider}:${expectedPin.modelId}`);
            if (!actual || actual.version !== expectedPin.version) {
                return false;
            }
        }
        return true;
    }
}

/**
 * Output cache - caches LLM outputs by (prompt, spec, model, version)
 */
export class OutputCache<T = unknown> {
    private cache = new Map<string, CacheEntry<T>>();
    private cacheFile: string;
    private modelPinner: ModelPinner;

    constructor(cacheFile: string = 'loop/output-cache.json', modelPinner?: ModelPinner) {
        this.cacheFile = cacheFile;
        this.modelPinner = modelPinner || new ModelPinner();
        this.load();
    }

    private load(): void {
        if (existsSync(this.cacheFile)) {
            try {
                const content = readFileSync(this.cacheFile, 'utf-8');
                const entries = JSON.parse(content);
                for (const [key, entry] of Object.entries(entries)) {
                    this.cache.set(key, entry as CacheEntry<T>);
                }
            } catch {
                // Ignore corrupt file
            }
        }
    }

    private save(): void {
        mkdirSync(dirname(this.cacheFile), { recursive: true });
        const obj = Object.fromEntries(this.cache);
        writeFileSync(this.cacheFile, JSON.stringify(obj, null, 2));
    }

    private generateKey(prompt: string, spec: string, model: string, version: string): string {
        return createHash('sha256').update(`${prompt}|${spec}|${model}|${version}`).digest('hex');
    }

    get(prompt: string, spec: string, model: string, version: string): T | null {
        const key = this.generateKey(prompt, spec, model, version);
        const entry = this.cache.get(key);
        if (entry) {
            entry.hits++;
            this.save();
            return entry.value;
        }
        return null;
    }

    set(prompt: string, spec: string, model: string, version: string, value: T): void {
        const key = this.generateKey(prompt, spec, model, version);
        const modelPin = this.modelPinner.getPin(model, 'local-model') ||
            this.modelPinner.getPin(model, 'remote') ||
            this.modelPinner.pinModel(model, version, 'local-model');

        const entry: CacheEntry<T> = {
            key,
            value,
            modelPin,
            createdAt: new Date().toISOString(),
            hits: 0,
        };
        this.cache.set(key, entry);
        this.save();
    }

    has(prompt: string, spec: string, model: string, version: string): boolean {
        const key = this.generateKey(prompt, spec, model, version);
        return this.cache.has(key);
    }

    getStats(): { size: number; totalHits: number; entries: CacheEntry<T>[] } {
        const entries = Array.from(this.cache.values());
        return {
            size: entries.length,
            totalHits: entries.reduce((sum, e) => sum + e.hits, 0),
            entries,
        };
    }
}

/**
 * Replay system - records and replays full evaluation runs
 */
export class ReplaySystem {
    private records: ReplayRecord[] = [];
    private recordsFile: string;

    constructor(recordsFile: string = 'loop/replay-records.jsonl') {
        this.recordsFile = recordsFile;
        this.load();
    }

    private load(): void {
        if (existsSync(this.recordsFile)) {
            try {
                const content = readFileSync(this.recordsFile, 'utf-8');
                this.records = content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
            } catch {
                // Ignore corrupt file
            }
        }
    }

    private save(): void {
        mkdirSync(dirname(this.recordsFile), { recursive: true });
        writeFileSync(this.recordsFile, this.records.map(r => JSON.stringify(r)).join('\n') + '\n', { flag: 'a' });
    }

    record(record: Omit<ReplayRecord, 'id' | 'timestamp' | 'resultHash'>): ReplayRecord {
        const fullRecord: ReplayRecord = {
            ...record,
            id: `replay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            resultHash: this.computeResultHash(record.outputs),
        };
        this.records.push(fullRecord);
        this.save();
        return fullRecord;
    }

    private computeResultHash(outputs: Record<string, unknown>): string {
        const sorted = Object.keys(outputs).sort().reduce((acc, key) => {
            acc[key] = outputs[key];
            return acc;
        }, {} as Record<string, unknown>);
        return createHash('sha256').update(JSON.stringify(sorted)).digest('hex').slice(0, 16);
    }

    getRecord(id: string): ReplayRecord | undefined {
        return this.records.find(r => r.id === id);
    }

    getRecords(filter?: { since?: string; configHash?: string }): ReplayRecord[] {
        return this.records.filter(r => {
            if (filter?.since && r.timestamp < filter.since) return false;
            if (filter?.configHash && r.configHash !== filter.configHash) return false;
            return true;
        });
    }

    /**
     * Verify a replay produces identical results
     */
    verifyReplay(recordId: string, actualOutputs: Record<string, unknown>): boolean {
        const record = this.getRecord(recordId);
        if (!record) return false;
        const actualHash = createHash('sha256').update(JSON.stringify(actualOutputs)).digest('hex').slice(0, 16);
        return actualHash === record.resultHash;
    }

    getAllRecords(): ReplayRecord[] {
        return [...this.records];
    }
}

/**
 * Run context - captures all versions for reproducibility (B5)
 */
export interface RunContext {
    runId: string;
    timestamp: string;
    modelPins: ModelPin[];
    promptVersions: Record<string, string>;
    strategyVersions: Record<string, string>;
    ontologyVersion: string;
    evaluatorVersion: string;
    loopConfigHash: string;
    gitCommit?: string;
}

export function createRunContext(
    modelPinner: ModelPinner,
    promptVersions: Record<string, string>,
    strategyVersions: Record<string, string>,
    ontologyVersion: string,
    evaluatorVersion: string,
    loopConfigHash: string
): RunContext {
    return {
        runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        modelPins: modelPinner.getAllPins(),
        promptVersions,
        strategyVersions,
        ontologyVersion,
        evaluatorVersion,
        loopConfigHash,
        gitCommit: getGitCommit(),
    };
}

function getGitCommit(): string | undefined {
    try {
        const { execSync } = await import('child_process');
        return execSync('git rev-parse HEAD', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    } catch {
        return undefined;
    }
}

/**
 * Privacy redaction (B4) - redacts sensitive fields from records
 */
export const PRIVACY_REDACTION_FIELDS = [
    'userId',
    'sessionId',
    'ip',
    'userAgent',
    'rawInput',
    'apiKey',
    'token',
    'password',
    'secret',
] as const;

export type RedactionField = typeof PRIVACY_REDACTION_FIELDS[number];

export function redactSensitiveFields<T extends Record<string, unknown>>(
    obj: T,
    fields: RedactionField[] = PRIVACY_REDACTION_FIELDS
): T {
    const result = { ...obj };
    for (const field of fields) {
        if (field in result) {
            result[field] = '[REDACTED]';
        }
    }
    // Recursively redact nested objects
    for (const key of Object.keys(result)) {
        if (typeof result[key] === 'object' && result[key] !== null) {
            result[key] = redactSensitiveFields(result[key] as Record<string, unknown>, fields);
        }
    }
    return result;
}

/**
 * Default model pins for reproducible runs
 */
export const DEFAULT_MODEL_PINS: ModelPin[] = [
    {
        modelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        version: '1.0.0',
        provider: 'local-model',
        pinnedAt: '2026-10-29T00:00:00.000Z',
        hash: 'a1b2c3d4e5f67890',
    },
    {
        modelId: 'gemini-1.5-flash',
        version: '1.0.0',
        provider: 'remote',
        pinnedAt: '2026-10-29T00:00:00.000Z',
        hash: 'f6e5d4c3b2a10987',
    },
];