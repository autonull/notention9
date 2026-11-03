/**
 * JSONL EventStore Implementation
 * Append-only JSONL file with in-memory index
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LedgerEvent, LedgerEventType, LedgerPayload } from '../../telemetry/ledger.js';
import type { EventStore } from './index.js';
import { logWarn } from '../../utils/logging.js';
import { generateId } from '../../utils/common.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', '.notention', 'events');
const DEFAULT_EVENT_FILE = join(DATA_DIR, 'events.jsonl');

function computeHash(payload: LedgerPayload): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

export class JSONLEventStore implements EventStore {
    private filePath: string;
    private index: Map<string, number[]> = new Map(); // type -> line numbers
    private runIdIndex: Map<string, number[]> = new Map();
    private caseIdIndex: Map<string, number[]> = new Map();
    private revisionIdIndex: Map<string, number[]> = new Map();
    private initialized = false;
    
    constructor(filePath?: string) {
        this.filePath = filePath ?? DEFAULT_EVENT_FILE;
        
        if (!existsSync(DATA_DIR)) {
            mkdirSync(DATA_DIR, { recursive: true });
        }
    }
    
    async init(): Promise<void> {
        if (this.initialized) return;
        
        if (existsSync(this.filePath)) {
            await this.rebuildIndex();
        }
        this.initialized = true;
    }
    
    private async rebuildIndex(): Promise<void> {
        const content = readFileSync(this.filePath, 'utf-8');
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
    
    async append(event: Omit<LedgerEvent, 'id' | 'timestamp' | 'hash'>): Promise<LedgerEvent> {
        await this.init();
        
        const fullEvent: LedgerEvent = {
            ...event,
            id: generateId(),
            timestamp: new Date().toISOString(),
            hash: computeHash(event.payload),
        };
        
        const line = JSON.stringify(fullEvent) + '\n';
        appendFileSync(this.filePath, line, 'utf-8');
        
        // Update index
        const lineNum = this.getLineCount() - 1;
        this.indexEvent(fullEvent, lineNum);
        
        return fullEvent;
    }
    
    private getLineCount(): number {
        if (!existsSync(this.filePath)) return 0;
        const content = readFileSync(this.filePath, 'utf-8');
        return content.trim().split('\n').filter(l => l.length > 0).length;
    }
    
    async query(options: {
        type?: string;
        runId?: string;
        caseId?: string;
        revisionId?: string;
        since?: string;
        until?: string;
        limit?: number;
        offset?: number;
    }): Promise<LedgerEvent[]> {
        await this.init();
        
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
            candidateLines = Array.from({ length: this.getLineCount() }, (_, i) => i);
        }
        
        // Apply filters
        const sinceTime = options.since ? new Date(options.since).getTime() : 0;
        const untilTime = options.until ? new Date(options.until).getTime() : Infinity;
        const limit = options.limit ?? Infinity;
        const offset = options.offset ?? 0;
        
        const results: LedgerEvent[] = [];
        const content = readFileSync(this.filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);
        
        let skipped = 0;
        for (const lineNum of candidateLines) {
            if (lineNum >= lines.length) continue;
            if (results.length >= limit) break;
            if (skipped < offset) { skipped++; continue; }
            
            try {
                const event = JSON.parse(lines[lineNum]) as LedgerEvent;
                const eventTime = new Date(event.timestamp).getTime();
                
                if (eventTime < sinceTime || eventTime > untilTime) continue;
                
                // Verify hash
                const computedHash = computeHash(event.payload);
                if (computedHash !== event.hash) {
                    logWarn(`Event hash mismatch`, { lineNum, eventId: event.id });
                    continue;
                }
                
                results.push(event);
            } catch {
                // Skip malformed
            }
        }
        
        return results;
    }
    
    async getRunEvents(runId: string): Promise<LedgerEvent[]> {
        return this.query({ runId });
    }
    
    async count(options?: { type?: string; runId?: string; since?: string; until?: string }): Promise<number> {
        const events = await this.query({ ...options, limit: Infinity });
        return events.length;
    }
    
    async prune(olderThan: string): Promise<number> {
        await this.init();
        
        const cutoff = new Date(olderThan).getTime();
        const content = readFileSync(this.filePath, 'utf-8');
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
            writeFileSync(this.filePath, kept.join('\n') + '\n', 'utf-8');
            // Rebuild index
            this.index.clear();
            this.runIdIndex.clear();
            this.caseIdIndex.clear();
            this.revisionIdIndex.clear();
            await this.rebuildIndex();
        }
        
        return removed;
    }
    
    async exportRun(runId: string): Promise<string> {
        const events = await this.getRunEvents(runId);
        return JSON.stringify(events, null, 2);
    }
    
    async close(): Promise<void> {
        this.index.clear();
        this.runIdIndex.clear();
        this.caseIdIndex.clear();
        this.revisionIdIndex.clear();
        this.initialized = false;
    }
}