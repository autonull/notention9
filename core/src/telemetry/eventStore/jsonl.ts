/**
 * JSONL EventStore Implementation
 * Append-only JSONL file with in-memory index
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LedgerEvent, LedgerEventType, LedgerPayload } from '../../telemetry/ledger.js';
import type { EventStore } from './index.js';
import { logWarn } from '../../utils/logging.js';
import { generateId, getProjectRoot } from '../../utils/common.js';
import { BaseEventStore } from './baseEventStore.js';

const PROJECT_ROOT = getProjectRoot(import.meta.url);
const DATA_DIR = join(PROJECT_ROOT, '.notention', 'events');
const DEFAULT_EVENT_FILE = join(DATA_DIR, 'events.jsonl');

export class JSONLEventStore extends BaseEventStore {
    private filePath: string;
    private index: Map<string, number[]> = new Map(); // type -> line numbers
    private runIdIndex: Map<string, number[]> = new Map();
    private caseIdIndex: Map<string, number[]> = new Map();
    private revisionIdIndex: Map<string, number[]> = new Map();
    
    constructor(filePath?: string) {
        super();
        this.filePath = filePath ?? DEFAULT_EVENT_FILE;
        
        if (!existsSync(DATA_DIR)) {
            mkdirSync(DATA_DIR, { recursive: true });
        }
    }
    
    protected override computeHash(payload: LedgerPayload): string {
        return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
    }
    
    protected override async doInit(): Promise<void> {
        if (existsSync(this.filePath)) {
            await this.rebuildIndex();
        }
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
    
    protected indexEvent(event: LedgerEvent, lineNum: number): void {
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
    
    protected override async doAppend(event: LedgerEvent): Promise<void> {
        const line = JSON.stringify(event) + '\n';
        appendFileSync(this.filePath, line, 'utf-8');
    }
    
    protected override async doIndexEvent(event: LedgerEvent): Promise<void> {
        const lineNum = this.getLineCount() - 1;
        this.indexEvent(event, lineNum);
    }
    
    protected override async doQuery(options: {
        type?: string;
        runId?: string;
        caseId?: string;
        revisionId?: string;
        since?: string;
        until?: string;
        limit?: number;
        offset?: number;
    }): Promise<LedgerEvent[]> {
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
                const computedHash = this.computeHash(event.payload);
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
    
    private getLineCount(): number {
        if (!existsSync(this.filePath)) return 0;
        const content = readFileSync(this.filePath, 'utf-8');
        return content.trim().split('\n').filter(l => l.length > 0).length;
    }
    
    protected override async doCount(options?: { type?: string; runId?: string; since?: string; until?: string }): Promise<number> {
        const events = await this.doQuery({ ...options, limit: Infinity });
        return events.length;
    }
    
    protected override async doPrune(olderThan: string): Promise<number> {
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
    
    protected override async doClose(): Promise<void> {
        this.index.clear();
        this.runIdIndex.clear();
        this.caseIdIndex.clear();
        this.revisionIdIndex.clear();
    }
}