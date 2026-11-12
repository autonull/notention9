import { Filter } from '../types.js';
import { LocalRelay, localRelayPool } from './LocalRelay.js';
import { encodeEventToCBOR, decodeEventFromCBOR, computeNoteID, verifyEventSignature } from './protocol.js';
import type { EventEnvelope, Transport, NetworkStatus } from '../types.js';
import { Logger } from '../../utils/logging.js';

const logger = Logger.create('LocalTransport');

export class LocalTransport implements Transport {
    private relay: LocalRelay;

    constructor(relay?: LocalRelay) {
        this.relay = relay ?? localRelayPool.getRelay();
    }

    async publish(envelope: EventEnvelope): Promise<string> {
        if (!verifyEventSignature(envelope)) {
            throw new Error('Invalid event signature');
        }

        const success = this.relay.publish(envelope);
        if (!success) {
            throw new Error('Failed to publish to local relay');
        }

        return envelope.id;
    }

    subscribe(filters: Filter[], onEvent: (envelope: EventEnvelope) => void): () => void {
        const subId = this.relay.subscribe(
            filters,
            (event) => onEvent(event),
            () => {}
        );

        return () => this.relay.unsubscribe(subId);
    }

    getStatus(): NetworkStatus {
        return {
            connected: true,
            details: `Local relay: ${this.relay.getEventCount()} events`,
            lastSeen: Date.now(),
        };
    }

    getRelay(): LocalRelay {
        return this.relay;
    }
}

export const localTransport = new LocalTransport();