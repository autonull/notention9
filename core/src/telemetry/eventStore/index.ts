/**
 * EventStore Interface + Implementations (E4)
 * Pluggable event storage: JSONL, SQLite
 */

import type { LedgerEvent } from '../../telemetry/ledger.js';
import { JSONLEventStore } from './jsonl.js';
import { SQLiteEventStore } from './sqlite.js';
import { FactoryRegistry, createPluginFactoryRegistry } from '../../utils/PluginRegistry.js';

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

const { registry: eventStoreRegistry, get: getEventStoreRegistry, reset: resetEventStoreRegistry } = 
    createPluginFactoryRegistry('EventStore', [
        { name: 'jsonl', create: (path?: string) => new JSONLEventStore(path), description: 'JSONL file-based storage' },
        { name: 'sqlite', create: (path: string) => new SQLiteEventStore(path), description: 'SQLite-backed storage' },
    ]);

// --- Export registry and singleton ---
export { eventStoreRegistry, getEventStoreRegistry, resetEventStoreRegistry };