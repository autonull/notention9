/**
 * EventStore Interface + Implementations (E4)
 * Pluggable event storage: JSONL, SQLite
 */

import type { LedgerEvent } from '../../telemetry/ledger.js';
import { JSONLEventStore } from './jsonl.js';
import { SQLiteEventStore } from './sqlite.js';

// --- EventStore Interface ---

export interface EventStore {
    /** Initialize the store */
    init(): Promise<void>;
    
    /** Append an event */
    append(event: Omit<LedgerEvent, 'id' | 'timestamp' | 'hash'>): Promise<LedgerEvent>;
    
    /** Query events with filters */
    query(options: {
        type?: string;
        runId?: string;
        caseId?: string;
        revisionId?: string;
        since?: string;
        until?: string;
        limit?: number;
        offset?: number;
    }): Promise<LedgerEvent[]>;
    
    /** Get all events for a run */
    getRunEvents(runId: string): Promise<LedgerEvent[]>;
    
    /** Get event count */
    count(options?: { type?: string; runId?: string; since?: string; until?: string }): Promise<number>;
    
    /** Prune old events */
    prune(olderThan: string): Promise<number>;
    
    /** Export events for a run */
    exportRun(runId: string): Promise<string>;
    
    /** Close the store */
    close(): Promise<void>;
}

// --- Re-export implementations ---
export { JSONLEventStore } from './jsonl.js';
export { SQLiteEventStore } from './sqlite.js';

// --- Factory functions ---

export function createJSONLEventStore(filePath?: string): JSONLEventStore {
    return new JSONLEventStore(filePath);
}

export function createSQLiteEventStore(dbPath: string): SQLiteEventStore {
    return new SQLiteEventStore(dbPath);
}

// --- Registry ---

export class EventStoreRegistry {
    private stores = new Map<string, { create: (...args: any[]) => EventStore; description: string }>();
    
    constructor() {
        this.register('jsonl', (path?: string) => new JSONLEventStore(path), 'JSONL file-based storage');
        this.register('sqlite', (path: string) => new SQLiteEventStore(path), 'SQLite-backed storage');
    }
    
    register(name: string, factory: (...args: any[]) => EventStore, description: string): void {
        this.stores.set(name, { create: factory, description });
    }
    
    create(name: string, ...args: any[]): EventStore {
        const store = this.stores.get(name);
        if (!store) {
            throw new Error(`Unknown EventStore: ${name}. Available: ${Array.from(this.stores.keys()).join(', ')}`);
        }
        return store.create(...args);
    }
    
    listNames(): string[] {
        return Array.from(this.stores.keys());
    }
}

let eventStoreRegistryInstance: EventStoreRegistry | null = null;

export function getEventStoreRegistry(): EventStoreRegistry {
    if (!eventStoreRegistryInstance) {
        eventStoreRegistryInstance = new EventStoreRegistry();
    }
    return eventStoreRegistryInstance;
}

export function resetEventStoreRegistry(): void {
    eventStoreRegistryInstance = null;
}