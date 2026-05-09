import { NetworkProvider, NetworkTransport } from './types.js';
import { Note, PrivacyLevel, OntologyNode } from '../types/index.js';
import { ScoredMatch } from '../nostr/discovery.js';
import { Logger } from '../utils/logging.js';
import { encode, decode } from 'cbor-x';

export interface MeshtasticConfig {
    enabled?: boolean;
    connectionType?: 'webserial' | 'http' | 'server-proxy';
    httpUrl?: string;
    nodeId?: string;
    transport?: NetworkTransport;
}

export class MeshtasticNetworkProvider implements NetworkProvider {
    readonly id = 'meshtastic';
    readonly name = 'Meshtastic';
    private logger = Logger.getInstance();
    private _onNote?: (note: Note) => void;
    private _transport: NetworkTransport | null = null;

    constructor(private config: MeshtasticConfig = {}) {
        if (config.transport) {
            this.setTransport(config.transport);
        }
    }

    setTransport(transport: NetworkTransport) {
        this._transport = transport;
        this._transport.onData((data, from) => this.handleIncomingPacket(data, from));
    }

    get enabled() {
        return this.config.enabled ?? false;
    }

    set enabled(val: boolean) {
        this.config.enabled = val;
    }

    async initialize(): Promise<void> {
        this.logger.info("Initializing Meshtastic provider");
    }

    async sendNote(note: Note, ontology?: OntologyNode[]): Promise<void> {
        if (!this.enabled) return;

        const compactData = this.serializeNote(note);
        this.logger.info(`Sending compact note to Meshtastic mesh (${compactData.byteLength} bytes)`);

        if (this._transport) {
            await this._transport.send(compactData);
        } else if (this.config.connectionType === 'server-proxy') {
            // This is a special case where we might rely on the UI layer to bridge to AgentService
            this.logger.info("Meshtastic: Delegating send to proxy transport");
        }
    }

    async discoverMatches(note: Note, ontology: OntologyNode[], privacyMode: PrivacyLevel): Promise<ScoredMatch[]> {
        return [];
    }

    subscribe(onNote: (note: Note) => void): () => void {
        this._onNote = onNote;
        return () => {
            this._onNote = undefined;
        };
    }

    isSupported(): boolean {
        return true;
    }

    serializeNote(note: Note): Uint8Array {
        const compact = {
            i: note.id.slice(0, 8),
            c: note.content,
            p: note.properties.map(p => [p.key, p.operator, p.values]),
            a: note.author,
            t: Math.floor(new Date(note.createdAt).getTime() / 1000)
        };
        return encode(compact);
    }

    handleIncomingPacket(data: Uint8Array, fromNode: string) {
        try {
            const decoded = decode(data);
            if (decoded && decoded.i && decoded.c) {
                const note = this.mapToNote(decoded, fromNode);
                if (this._onNote) {
                    this._onNote(note);
                }
            }
        } catch (e) {
            this.logger.error("Failed to decode Meshtastic packet", e as Error);
        }
    }

    private mapToNote(data: any, fromNode: string): Note {
        const timestamp = new Date(data.t * 1000).toISOString();
        return {
            id: `mesh-${fromNode}-${data.i}`,
            title: '',
            content: data.c,
            tags: [],
            properties: (data.p || []).map((p: any) => ({
                key: p[0],
                operator: p[1],
                values: p[2]
            })),
            createdAt: timestamp,
            updatedAt: timestamp,
            publishedAt: timestamp,
            source: {
                type: 'import',
                identifier: `meshtastic-${fromNode}`,
                timestamp: Date.now()
            },
            privacy: 'public',
            priority: 0.5,
            author: `mesh:${fromNode}`
        };
    }

    mapTelemetryToNote(nodeId: string, telemetry: any): Note {
        const timestamp = new Date().toISOString();
        return {
            id: `mesh-telemetry-${nodeId}-${Date.now()}`,
            title: `Node ${nodeId} Telemetry`,
            content: `Telemetry update from node ${nodeId}`,
            tags: ['telemetry', 'meshtastic'],
            properties: [
                { key: 'battery', operator: 'is', values: [String(telemetry.batteryLevel || '')] },
                { key: 'voltage', operator: 'is', values: [String(telemetry.voltage || '')] },
                { key: 'channel-utilization', operator: 'is', values: [String(telemetry.channelUtilization || '')] }
            ].filter(p => p.values[0] !== ''),
            createdAt: timestamp,
            updatedAt: timestamp,
            source: {
                type: 'import',
                identifier: `meshtastic-telemetry-${nodeId}`,
                timestamp: Date.now()
            },
            privacy: 'public',
            priority: 0.1,
            author: `mesh:${nodeId}`
        };
    }

    mapPositionToNote(nodeId: string, pos: { latitude: number, longitude: number, altitude?: number }): Note {
        const timestamp = new Date().toISOString();
        return {
            id: `mesh-pos-${nodeId}-${Date.now()}`,
            title: `Node ${nodeId} Position`,
            content: `Position update from node ${nodeId}`,
            tags: ['position', 'meshtastic'],
            properties: [
                { key: 'location', operator: 'is', values: [`${pos.latitude},${pos.longitude}`] },
                { key: 'altitude', operator: 'is', values: [String(pos.altitude || '')] }
            ].filter(p => p.values[0] !== ''),
            createdAt: timestamp,
            updatedAt: timestamp,
            source: {
                type: 'import',
                identifier: `meshtastic-pos-${nodeId}`,
                timestamp: Date.now()
            },
            privacy: 'public',
            priority: 0.1,
            author: `mesh:${nodeId}`
        };
    }
}
