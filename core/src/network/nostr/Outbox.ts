import { EventEnvelope } from '../types.js';
import { JsonStore } from '../../storage/Storage.js';
import { getIndexedDBAdapter } from '../../storage/indexedDB.js';
import { Logger } from '../../utils/logging.js';

const logger = Logger.create('Outbox');

export interface OutboxEntry {
    envelope: EventEnvelope;
    addedAt: number;
    attempts: number;
    lastAttempt?: number;
    lastError?: string;
    targetRelays: string[];
}

export interface OutboxConfig {
    maxRetries?: number;
    baseRetryDelay?: number;
    maxRetryDelay?: number;
    storageKey?: string;
}

export class Outbox {
    private store: JsonStore<OutboxEntry[]>;
    private config: Required<OutboxConfig>;

    constructor(config: OutboxConfig = {}) {
        this.config = {
            maxRetries: config.maxRetries ?? 10,
            baseRetryDelay: config.baseRetryDelay ?? 1000,
            maxRetryDelay: config.maxRetryDelay ?? 60000,
            storageKey: config.storageKey ?? 'notention-outbox',
        };

        const isBrowser = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
        const adapter = isBrowser ? getIndexedDBAdapter('notention', 'outbox') : undefined;

        this.store = new JsonStore<OutboxEntry[]>(this.config.storageKey, adapter);
    }

    async load(): Promise<void> {
        await this.store.load();
    }

    async add(envelope: EventEnvelope, targetRelays: string[] = []): Promise<void> {
        const entries = (await this.store.load()) ?? [];
        const now = Date.now();

        const existingIndex = entries.findIndex(e => e.envelope.id === envelope.id);
        if (existingIndex >= 0) {
            logger.debug(`Event ${envelope.id} already in outbox, skipping duplicate`);
            return;
        }

        const entry: OutboxEntry = {
            envelope,
            addedAt: now,
            attempts: 0,
            targetRelays: targetRelays.length > 0 ? targetRelays : [],
        };

        entries.push(entry);
        await this.store.save(entries);
        logger.debug(`Added event ${envelope.id} to outbox (queue size: ${entries.length})`);
    }

    async getPending(maxRetries?: number): Promise<OutboxEntry[]> {
        const entries = (await this.store.load()) ?? [];
        const limit = maxRetries ?? this.config.maxRetries;
        return entries.filter(e => e.attempts < limit);
    }

    async getAll(): Promise<OutboxEntry[]> {
        return (await this.store.load()) ?? [];
    }

    async markAttempt(id: string, error?: string): Promise<void> {
        const entries = (await this.store.load()) ?? [];
        const entry = entries.find(e => e.envelope.id === id);
        if (entry) {
            entry.attempts++;
            entry.lastAttempt = Date.now();
            if (error) entry.lastError = error;
            await this.store.save(entries);
        }
    }

    async markSuccess(id: string): Promise<void> {
        const entries = (await this.store.load()) ?? [];
        const filtered = entries.filter(e => e.envelope.id !== id);
        await this.store.save(filtered);
        logger.debug(`Removed event ${id} from outbox after success (remaining: ${filtered.length})`);
    }

    async remove(id: string): Promise<void> {
        const entries = (await this.store.load()) ?? [];
        const filtered = entries.filter(e => e.envelope.id !== id);
        await this.store.save(filtered);
    }

    async clear(): Promise<void> {
        await this.store.clear();
    }

    async getQueueDepth(): Promise<number> {
        const entries = (await this.store.load()) ?? [];
        return entries.length;
    }

    calculateBackoff(attempts: number): number {
        const delay = this.config.baseRetryDelay * Math.pow(2, attempts);
        const jitter = Math.random() * 0.3 * delay;
        return Math.min(delay + jitter, this.config.maxRetryDelay);
    }

    async getStaleEntries(maxAge: number = 3600000): Promise<OutboxEntry[]> {
        const entries = (await this.store.load()) ?? [];
        const now = Date.now();
        return entries.filter(e => now - e.addedAt > maxAge);
    }
}

export function createOutbox(config?: OutboxConfig): Outbox {
    return new Outbox(config);
}