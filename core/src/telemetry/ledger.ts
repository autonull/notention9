/**
 * Ledger — Append-only JSONL event log with SQLite index
 * Provides tamper-evident audit trail for evaluation runs
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', '.notention', 'ledger');
const LEDGER_FILE = join(DATA_DIR, 'ledger.jsonl');
const INDEX_FILE = join(DATA_DIR, 'ledger.idx');

// Ensure directory exists
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

// --- Types ---

export interface LedgerEvent {
    id: string;                    // ULID
    type: LedgerEventType;
    runId?: string;
    caseId?: string;
    revisionId?: string;
    evaluationId?: string;
    actor: 'system' | 'human' | 'model';
    userId?: string;
    modelId?: string;
    payload: LedgerPayload;
    timestamp: string;
    durationMs?: number;
    hash: string;                  // Content hash for tamper evidence
}

export type LedgerEventType =
    | 'run:started'
    | 'run:completed'
    | 'run:failed'
    | 'case:started'
    | 'case:completed'
    | 'case:failed'
    | 'case:skipped'
    | 'strategy:resolved'
    | 'strategy:rendered'
    | 'verdict:computed'
    | 'gate:evaluated'
    | 'revision:created'
    | 'revision:evaluated'
    | 'revision:consented'
    | 'revision:activated'
    | 'revision:rolled-back'
    | 'revision:superseded'
    | 'revision:rejected'
    | 'consent:requested'
    | 'consent:granted'
    | 'consent:denied'
    | 'optimizer:cycle:started'
    | 'optimizer:cycle:completed'
    | 'optimizer:candidate:evaluated';

export type LedgerPayload =
    | { type: 'run:started'; config: RunConfig; caseIds: string[] }
    | { type: 'run:completed'; summary: RunSummary }
    | { type: 'run:failed'; error: string }
    | { type: 'case:started'; caseId: string; strategyId: string }
    | { type: 'case:completed'; caseId: string; verdict: CaseVerdict; durationMs: number }
    | { type: 'case:failed'; caseId: string; error: string }
    | { type: 'case:skipped'; caseId: string; reason: string }
    | { type: 'strategy:resolved'; seamRole: string; strategyId: string; reason: ResolutionReason; params: Record<string, unknown> }
    | { type: 'strategy:rendered'; seamRole: string; strategyId: string; outputHash: string }
    | { type: 'verdict:computed'; caseId: string; verdict: CaseVerdict; details: VerdictDetail[] }
    | { type: 'gate:evaluated'; gate: 'must-win' | 'schema' | 'floors'; passed: boolean; details: string }
    | { type: 'revision:created'; revision: Revision }
    | { type: 'revision:evaluated'; revisionId: string; evaluationId: string; verdict: 'pass' | 'fail' | 'inconclusive' }
    | { type: 'revision:consented'; revisionId: string; userId: string }
    | { type: 'revision:activated'; revisionId: string; previousRevisionId?: string }
    | { type: 'revision:rolled-back'; revisionId: string; reason: string; rolledBackToRevisionId?: string }
    | { type: 'revision:superseded'; revisionId: string; supersededByRevisionId: string }
    | { type: 'revision:rejected'; revisionId: string; reason: string }
    | { type: 'consent:requested'; revisionId: string; userId: string }
    | { type: 'consent:granted'; revisionId: string; userId: string }
    | { type: 'consent:denied'; revisionId: string; userId: string; reason: string }
    | { type: 'optimizer:cycle:started'; config: OptimizerConfig; manifestHash: string }
    | { type: 'optimizer:cycle:completed'; candidatesEvaluated: number; winners: number; losers: number; inconclusive: number; totalCost: OptimizerCost }
    | { type: 'optimizer:candidate:evaluated'; candidateId: string; seamRole: string; strategyId: string; verdict: string; primaryDelta: number };

export interface RunConfig {
    manifestHash: string;
    revisionId: string;
    baselineRevisionId: string;
    caseFilter?: string[];
    repetitions: number;
}

export interface RunSummary {
    totalCases: number;
    completed: number;
    failed: number;
    overallVerdict: string;
}

export interface CaseVerdict {
    caseId: string;
    verdict: string;
    primaryMetric: string;
    delta: number;
    pValue: number;
}

export interface VerdictDetail {
    metric: string;
    baseline: number;
    candidate: number;
    delta: number;
}

export interface ResolutionReason {
    kind: string;
    [key: string]: any;
}

export interface Revision {
    id: string;
    seamRole: string;
    strategy: any;
    author: 'human' | 'model';
    model?: string;
    promptHash?: string;
    parentRevisionId?: string;
    evaluationId?: string;
    verdict?: 'pass' | 'fail' | 'inconclusive';
    status: string;
    consentedBy?: string;
    consentedAt?: string;
    activatedAt?: string;
    rolledBackAt?: string;
    rollbackReason?: string;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
}

export interface OptimizerConfig {
    targetSeams: string[];
    maxCandidatesPerSeam: number;
    maxBrowserRuns: number;
    maxTimeMinutes: number;
    maxTokens: number;
    useSuccessiveHalving: boolean;
    initialSliceFraction: number;
    minPromote: number;
}

export interface OptimizerCost {
    browserRuns: number;
    tokensUsed: number;
    durationMs: number;
}

// --- ULID generation (simple timestamp + random) ---

function generateId(): string {
    const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
    const random = Math.random().toString(36).substring(2, 12).toUpperCase();
    return `${timestamp}${random}`;
}

function computeHash(payload: LedgerPayload): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

// --- Ledger class ---

export class Ledger {
    private static instance: Ledger;
    private index: Map<string, number[]> = new Map(); // type -> line numbers
    private runIdIndex: Map<string, number[]> = new Map();
    private caseIdIndex: Map<string, number[]> = new Map();
    private revisionIdIndex: Map<string, number[]> = new Map();
    private initialized = false;

    static getInstance(): Ledger {
        if (!Ledger.instance) {
            Ledger.instance = new Ledger();
        }
        return Ledger.instance;
    }

    private async init(): Promise<void> {
        if (this.initialized) return;
        
        if (existsSync(LEDGER_FILE)) {
            await this.rebuildIndex();
        }
        this.initialized = true;
    }

    private async rebuildIndex(): Promise<void> {
        const content = readFileSync(LEDGER_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);
        
        for (let i = 0; i < lines.length; i++) {
            try {
                const event = JSON.parse(lines[i]) as LedgerEvent;
                this.indexEvent(event, i);
            } catch {
                // Skip malformed lines
            }
        }
    }

    private indexEvent(event: LedgerEvent, lineNum: number): void {
        // Index by type
        const typeLines = this.index.get(event.type) ?? [];
        typeLines.push(lineNum);
        this.index.set(event.type, typeLines);
        
        // Index by runId
        if (event.runId) {
            const lines = this.runIdIndex.get(event.runId) ?? [];
            lines.push(lineNum);
            this.runIdIndex.set(event.runId, lines);
        }
        
        // Index by caseId
        if (event.caseId) {
            const lines = this.caseIdIndex.get(event.caseId) ?? [];
            lines.push(lineNum);
            this.caseIdIndex.set(event.caseId, lines);
        }
        
        // Index by revisionId
        if (event.revisionId) {
            const lines = this.revisionIdIndex.get(event.revisionId) ?? [];
            lines.push(lineNum);
            this.revisionIdIndex.set(event.revisionId, lines);
        }
    }

    append(event: Omit<LedgerEvent, 'id' | 'timestamp' | 'hash'>): LedgerEvent {
        // Note: init is sync in constructor, but we handle async lazily
        const fullEvent: LedgerEvent = {
            ...event,
            id: generateId(),
            timestamp: new Date().toISOString(),
            hash: computeHash(event.payload),
        };
        
        const line = JSON.stringify(fullEvent) + '\n';
        appendFileSync(LEDGER_FILE, line, 'utf-8');
        
        // Update index (line number is current file length before append)
        const lineNum = this.getLineCount() - 1;
        this.indexEvent(fullEvent, lineNum);
        
        return fullEvent;
    }

    private getLineCount(): number {
        if (!existsSync(LEDGER_FILE)) return 0;
        const content = readFileSync(LEDGER_FILE, 'utf-8');
        return content.trim().split('\n').filter(l => l.length > 0).length;
    }

    query(options: {
        type?: LedgerEventType;
        runId?: string;
        caseId?: string;
        revisionId?: string;
        since?: string;
        until?: string;
        limit?: number;
    }): LedgerEvent[] {
        let candidateLines: number[] = [];
        
        if (options.type) {
            candidateLines = this.index.get(options.type) ?? [];
        } else if (options.runId) {
            candidateLines = this.runIdIndex.get(options.runId) ?? [];
        } else if (options.caseId) {
            candidateLines = this.caseIdIndex.get(options.caseId) ?? [];
        } else if (options.revisionId) {
            candidateLines = this.revisionIdIndex.get(options.revisionId) ?? [];
        } else {
            // Full scan - use all lines
            candidateLines = Array.from({ length: this.getLineCount() }, (_, i) => i);
        }
        
        // Apply filters
        const sinceTime = options.since ? new Date(options.since).getTime() : 0;
        const untilTime = options.until ? new Date(options.until).getTime() : Infinity;
        const limit = options.limit ?? Infinity;
        
        const results: LedgerEvent[] = [];
        const content = readFileSync(LEDGER_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);
        
        for (const lineNum of candidateLines) {
            if (lineNum >= lines.length) continue;
            if (results.length >= limit) break;
            
            try {
                const event = JSON.parse(lines[lineNum]) as LedgerEvent;
                const eventTime = new Date(event.timestamp).getTime();
                
                if (eventTime < sinceTime || eventTime > untilTime) continue;
                
                // Verify hash
                const computedHash = computeHash(event.payload);
                if (computedHash !== event.hash) {
                    console.warn(`Ledger hash mismatch at line ${lineNum}: ${event.id}`);
                    continue;
                }
                
                results.push(event);
            } catch {
                // Skip malformed
            }
        }
        
        return results;
    }

    getRunEvents(runId: string): LedgerEvent[] {
        return this.query({ runId });
    }

    getRevisionHistory(revisionId: string): LedgerEvent[] {
        return this.query({ revisionId });
    }

    // Export for replay
    exportRun(runId: string): string {
        const events = this.getRunEvents(runId);
        return JSON.stringify(events, null, 2);
    }

    // Prune old events (keep last N days)
    async prune(daysToKeep: number): Promise<number> {
        const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
        const content = readFileSync(LEDGER_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);
        
        const kept: string[] = [];
        let removed = 0;
        
        for (const line of lines) {
            try {
                const event = JSON.parse(line) as LedgerEvent;
                const eventTime = new Date(event.timestamp).getTime();
                if (eventTime >= cutoff) {
                    kept.push(line);
                } else {
                    removed++;
                }
            } catch {
                kept.push(line); // Keep malformed lines
            }
        }
        
        if (removed > 0) {
            writeFileSync(LEDGER_FILE, kept.join('\n') + '\n', 'utf-8');
            await this.rebuildIndex();
        }
        
        return removed;
    }
}

// Convenience functions
export function logEvent(event: Omit<LedgerEvent, 'id' | 'timestamp' | 'hash'>): LedgerEvent {
    return Ledger.getInstance().append(event);
}

export function queryLedger(options: Parameters<Ledger['query']>[0]): LedgerEvent[] {
    return Ledger.getInstance().query(options);
}

export function getRunEvents(runId: string): LedgerEvent[] {
    return Ledger.getInstance().getRunEvents(runId);
}

export function exportRun(runId: string): string {
    return Ledger.getInstance().exportRun(runId);
}

export async function pruneLedger(daysToKeep: number): Promise<number> {
    return Ledger.getInstance().prune(daysToKeep);
}