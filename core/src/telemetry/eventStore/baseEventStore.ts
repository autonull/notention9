/**
 * Base EventStore Plugin
 * Shared base class for all event store implementations
 */

import type { LedgerEvent, LedgerEventType, LedgerPayload } from '../ledger.js';
import type { EventStore } from './index.js';
import { generateId } from '../../utils/common.js';

/** Function to compute event hash from payload */
type EventHasher = (payload: LedgerPayload) => string;

/** Base configuration for event stores */
export interface BaseEventStoreConfig {
    // Empty for now, extensible
}

export abstract class BaseEventStore implements EventStore {
    protected initialized = false;
    protected config: BaseEventStoreConfig = {};

    /** Compute hash for an event payload */
    protected abstract computeHash(payload: LedgerPayload): string;

    async init(): Promise<void> {
        if (this.initialized) return;
        await this.doInit();
        this.initialized = true;
    }

    /** Store-specific initialization (rebuild indexes, create tables, etc.) */
    protected async doInit(): Promise<void> {}

    async append(event: Omit<LedgerEvent, 'id' | 'timestamp' | 'hash'>): Promise<LedgerEvent> {
        await this.init();
        
        const fullEvent: LedgerEvent = {
            ...event,
            id: generateId(),
            timestamp: new Date().toISOString(),
            hash: this.computeHash(event.payload),
        };
        
        await this.doAppend(fullEvent);
        await this.doIndexEvent(fullEvent);
        
        return fullEvent;
    }

    /** Store the event (override for each store) */
    protected abstract doAppend(event: LedgerEvent): Promise<void>;

    /** Index the event for querying (override for each store) */
    protected abstract doIndexEvent(event: LedgerEvent): Promise<void>;

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
        return this.doQuery(options);
    }

    /** Execute query (override for each store) */
    protected abstract doQuery(options: {
        type?: string;
        runId?: string;
        caseId?: string;
        revisionId?: string;
        since?: string;
        until?: string;
        limit?: number;
        offset?: number;
    }): Promise<LedgerEvent[]>;

    async getRunEvents(runId: string): Promise<LedgerEvent[]> {
        return this.query({ runId });
    }

    async count(options?: { type?: string; runId?: string; since?: string; until?: string }): Promise<number> {
        await this.init();
        return this.doCount(options);
    }

    /** Count events (override for each store) */
    protected abstract doCount(options?: { type?: string; runId?: string; since?: string; until?: string }): Promise<number>;

    async prune(olderThan: string): Promise<number> {
        await this.init();
        return this.doPrune(olderThan);
    }

    /** Prune old events (override for each store) */
    protected abstract doPrune(olderThan: string): Promise<number>;

    async exportRun(runId: string): Promise<string> {
        const events = await this.getRunEvents(runId);
        return JSON.stringify(events, null, 2);
    }

    async close(): Promise<void> {
        this.initialized = false;
        await this.doClose();
    }

    /** Store-specific cleanup */
    protected async doClose(): Promise<void> {}
}