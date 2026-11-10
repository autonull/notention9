/**
 * Ledger — Append-only JSONL event log with SQLite index
 * Provides tamper-evident audit trail for evaluation runs
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSingleton } from '../utils/singletonFactory.js';
import { logWarn } from '../utils/logging.js';
import { generateId, getProjectRoot } from '../utils/common.js';
import type { 
    LedgerEvent, LedgerEventType, LedgerPayload, 
    RunConfig, RunSummary, CaseVerdict, VerdictDetail, 
    ResolutionReason, Revision, OptimizerConfig, OptimizerCost 
} from './types.js';

const PROJECT_ROOT = getProjectRoot(import.meta.url);
const DATA_DIR = join(PROJECT_ROOT, '.notention', 'ledger');
const LEDGER_FILE = join(DATA_DIR, 'ledger.jsonl');
const INDEX_FILE = join(DATA_DIR, 'ledger.idx');

// Ensure directory exists
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

// Re-export types from shared location
export type { 
    LedgerEvent, LedgerEventType, LedgerPayload, 
    RunConfig, RunSummary, CaseVerdict, VerdictDetail, 
    ResolutionReason, Revision, OptimizerConfig, OptimizerCost 
} from './types.js';

// --- ULID generation (simple timestamp + random) ---

function computeHash(payload: LedgerPayload): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

// --- Ledger class ---

export class Ledger {
    private index: Map<string, number[]> = new Map(); // type -> line numbers
    private runIdIndex: Map<string, number[]> = new Map();
    private caseIdIndex: Map<string, number[]> = new Map();
    private revisionIdIndex: Map<string, number[]> = new Map();
    private initialized = false;

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
                    logWarn(`Ledger hash mismatch`, { lineNum, eventId: event.id });
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

// --- Singleton instance ---
const { get: getLedgerInstance, reset: resetLedgerInstance } = createSingleton(() => new Ledger());

// Convenience functions
export function logEvent(event: Omit<LedgerEvent, 'id' | 'timestamp' | 'hash'>): LedgerEvent {
    return getLedgerInstance().append(event);
}

export function queryLedger(options: Parameters<Ledger['query']>[0]): LedgerEvent[] {
    return getLedgerInstance().query(options);
}

export function getRunEvents(runId: string): LedgerEvent[] {
    return getLedgerInstance().getRunEvents(runId);
}

export function exportRun(runId: string): string {
    return getLedgerInstance().exportRun(runId);
}

export async function pruneLedger(daysToKeep: number): Promise<number> {
    return getLedgerInstance().prune(daysToKeep);
}

export function getLedger(): Ledger {
    return getLedgerInstance();
}

export function resetLedger(): void {
    resetLedgerInstance();
}

// --- Match act step convenience functions ---

export function logMatchAccepted(
    requestNoteId: string,
    offerNoteId: string,
    responseNoteId: string,
    score: number,
    userId?: string
): LedgerEvent {
    return logEvent({
        type: 'match:accepted',
        actor: 'human',
        userId,
        payload: { type: 'match:accepted', requestNoteId, offerNoteId, responseNoteId, score, userId },
    });
}

export function logMatchWithdrawn(
    responseNoteId: string,
    requestNoteId: string,
    offerNoteId: string,
    userId?: string
): LedgerEvent {
    return logEvent({
        type: 'match:withdrawn',
        actor: 'human',
        userId,
        payload: { type: 'match:withdrawn', responseNoteId, requestNoteId, offerNoteId, userId },
    });
}

export function logMatchRejected(
    requestNoteId: string,
    offerNoteId: string,
    userId?: string
): LedgerEvent {
    return logEvent({
        type: 'match:rejected',
        actor: 'human',
        userId,
        payload: { type: 'match:rejected', requestNoteId, offerNoteId, userId },
    });
}