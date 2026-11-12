import { SimplePool, Filter } from 'nostr-tools';
import type { NostrEvent } from '../../types/index.js';
import { Logger } from '../../utils/logging.js';
import { encodeEventToCBOR, decodeEventFromCBOR, signEvent, computeNoteID, verifyEventSignature } from './protocol.js';

const logger = Logger.create('LocalRelay');

export interface LocalRelayEvent {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
    sig: string;
    protocolVersion: number;
}

export interface Subscription {
    id: string;
    filters: Filter[];
    onEvent: (event: LocalRelayEvent) => void;
    onEose: () => void;
}

export class LocalRelay {
    private events: Map<string, LocalRelayEvent> = new Map();
    private subscriptions: Map<string, Subscription> = new Map();
    private nextSubId = 0;

    publish(event: LocalRelayEvent): boolean {
        if (!verifyEventSignature(event)) {
            logger.warn('Rejected event with invalid signature');
            return false;
        }

        const eventWithVersion = { ...event, protocolVersion: event.protocolVersion ?? 1 };

        const existing = this.events.get(eventWithVersion.id);
        if (existing) {
            logger.debug(`Event ${eventWithVersion.id} already exists, skipping`);
            return false;
        }

        this.events.set(eventWithVersion.id, eventWithVersion);
        logger.debug(`Published event ${eventWithVersion.id} (kind ${eventWithVersion.kind})`);

        for (const sub of this.subscriptions.values()) {
            if (this.matchesFilters(eventWithVersion, sub.filters)) {
                sub.onEvent(eventWithVersion);
            }
        }

        return true;
    }

    subscribe(filters: Filter[], onEvent: (event: LocalRelayEvent) => void, onEose: () => void): string {
        const subId = `sub_${++this.nextSubId}`;
        const subscription: Subscription = {
            id: subId,
            filters,
            onEvent,
            onEose,
        };
        this.subscriptions.set(subId, subscription);

        for (const event of this.events.values()) {
            if (this.matchesFilters(event, filters)) {
                onEvent(event);
            }
        }

        onEose();
        return subId;
    }

    unsubscribe(subId: string): void {
        this.subscriptions.delete(subId);
    }

    private matchesFilters(event: LocalRelayEvent, filters: Filter[]): boolean {
        return filters.some(filter => {
            if (filter.ids && !filter.ids.includes(event.id)) return false;
            if (filter.authors && !filter.authors.includes(event.pubkey)) return false;
            if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
            if (filter.since && event.created_at < filter.since) return false;
            if (filter.until && event.created_at > filter.until) return false;
            if (filter.limit) return true;

            if (filter['#d']) {
                const dTag = event.tags.find(t => t[0] === 'd');
                if (!dTag || !filter['#d'].includes(dTag[1])) return false;
            }

            for (const [key, values] of Object.entries(filter)) {
                if (key.startsWith('#') && key !== '#d') {
                    const tagKey = key.slice(1);
                    const tagValues = event.tags.filter(t => t[0] === tagKey).map(t => t[1]);
                    const filterValues = Array.isArray(values) ? values.map(String) : [];
                    if (!filterValues.some(v => tagValues.includes(v))) return false;
                }
            }

            return true;
        });
    }

    getEvent(id: string): LocalRelayEvent | undefined {
        return this.events.get(id);
    }

    getEvents(): LocalRelayEvent[] {
        return Array.from(this.events.values());
    }

    clear(): void {
        this.events.clear();
        this.subscriptions.clear();
    }

    getEventCount(): number {
        return this.events.size;
    }

    getSubscriptionCount(): number {
        return this.subscriptions.size;
    }
}

export class LocalRelayPool {
    private relay: LocalRelay;
    private eventIdMap: Map<string, string> = new Map();

    constructor() {
        this.relay = new LocalRelay();
    }

    async publish(relays: string[], event: NostrEvent): Promise<string[]> {
        const localEvent: LocalRelayEvent = {
            id: event.id,
            pubkey: event.pubkey,
            created_at: event.created_at,
            kind: event.kind,
            tags: event.tags,
            content: event.content,
            sig: event.sig,
            protocolVersion: 1,
        };

        const success = this.relay.publish(localEvent);
        if (!success) {
            throw new Error('Failed to publish to local relay');
        }

        return [localEvent.id];
    }

    subscribeMany(
        relays: string[],
        filter: Filter,
        options: {
            onevent: (event: NostrEvent) => void;
            oneose: () => void;
        }
    ): { close: () => void } {
        const subId = this.relay.subscribe(
            [filter],
            (event) => options.onevent(event),
            options.oneose
        );

        return {
            close: () => this.relay.unsubscribe(subId),
        };
    }

    getRelay(): LocalRelay {
        return this.relay;
    }
}

export const localRelayPool = new LocalRelayPool();