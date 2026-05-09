import { NetworkProvider, NetworkTransport, NetworkStatus } from './types.js';
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
    saveReceivedNotes?: boolean;
    agentService?: any; // To allow proxying via AgentService if available
}

export class MeshtasticNetworkProvider implements NetworkProvider {
    readonly id = 'meshtastic';
    readonly name = 'Meshtastic';
    private logger = Logger.getInstance();
    private _transport: NetworkTransport | null = null;
    private listeners: Record<string, ((...args: any[]) => void)[]> = {};

    constructor(private config: MeshtasticConfig = {}) {
        if (config.transport) {
            this.setTransport(config.transport);
        }
    }

    setTransport(transport: NetworkTransport | null) {
        this._transport = transport;
        if (this._transport) {
            this._transport.onData((data, from) => this.handleIncomingPacket(data, from));
        }
        this.emit('status_change', this.getStatus());
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

    getStatus(): NetworkStatus {
        return {
            connected: !!this._transport,
            details: this.config.connectionType ? `Type: ${this.config.connectionType}` : undefined
        };
    }

    async sendNote(note: Note, ontology?: OntologyNode[]): Promise<void> {
        if (!this.enabled) return;

        try {
            const compactData = this.serializeNote(note);
            if (compactData.byteLength > 200) {
                this.logger.warn(`Note ${note.id} is large for mesh: ${compactData.byteLength} bytes`);
            }
            this.logger.info(`Sending compact note to Meshtastic mesh (${compactData.byteLength} bytes)`);

            if (this._transport) {
                await this._transport.send(compactData);
            } else if (this.config.connectionType === 'server-proxy' && this.config.agentService) {
                this.logger.info("Meshtastic: Proxying send to AgentService");
                await this.config.agentService.meshSendNote(note);
            }
        } catch (e) {
            this.logger.error("Failed to send note over Meshtastic", e as Error);
            this.emit('error', { message: (e as Error).message, action: 'sendNote' });
            throw e;
        }
    }

    async discoverMatches(note: Note, ontology: OntologyNode[], privacyMode: PrivacyLevel): Promise<ScoredMatch[]> {
        // For Meshtastic, we don't have a central index to query like Nostr.
        // We rely on the local notes that have been received over the mesh.
        // In the future, we could implement a "discovery request" broadcast.
        return [];
    }

    isSupported(): boolean {
        return true;
    }

    on(event: string, callback: (...args: any[]) => void): void {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    off(event: string, callback: (...args: any[]) => void): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(l => l !== callback);
    }

    emit(event: string, ...args: any[]): void {
        const eventListeners = this.listeners[event];
        if (eventListeners) {
            eventListeners.forEach(fn => fn(...args));
        }
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
                this.emit('note', note);
            }
        } catch (e) {
            this.logger.error("Failed to decode Meshtastic packet", e as Error);
            this.emit('error', { message: 'Packet decoding failed', from: fromNode });
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

    getNodeNoteId(nodeId: string): string {
        return `mesh-node-${nodeId}`;
    }

    mapTelemetryToNote(nodeId: string, telemetry: any, existingNote?: Note): Note {
        const timestamp = new Date().toISOString();
        const properties = [
            { key: 'battery', operator: 'is', values: [String(telemetry.batteryLevel || '')] },
            { key: 'voltage', operator: 'is', values: [String(telemetry.voltage || '')] },
            { key: 'channel-utilization', operator: 'is', values: [String(telemetry.channelUtilization || '')] }
        ].filter(p => p.values[0] !== '');

        if (existingNote) {
            // Update existing note properties
            const newProps = [...existingNote.properties.filter(p => !['battery', 'voltage', 'channel-utilization'].includes(p.key)), ...properties];
            return {
                ...existingNote,
                properties: newProps,
                updatedAt: timestamp
            };
        }

        return {
            id: this.getNodeNoteId(nodeId),
            title: `Node ${nodeId}`,
            content: `Meshtastic Node ${nodeId}`,
            tags: ['meshtastic', 'node'],
            properties,
            createdAt: timestamp,
            updatedAt: timestamp,
            source: {
                type: 'import',
                identifier: `meshtastic-node-${nodeId}`,
                timestamp: Date.now()
            },
            privacy: 'public',
            priority: 0.1,
            author: `mesh:${nodeId}`
        };
    }

    mapPositionToNote(nodeId: string, pos: { latitude: number, longitude: number, altitude?: number }, existingNote?: Note): Note {
        const timestamp = new Date().toISOString();
        const properties = [
            { key: 'location', operator: 'is', values: [`${pos.latitude},${pos.longitude}`] },
            { key: 'altitude', operator: 'is', values: [String(pos.altitude || '')] }
        ].filter(p => p.values[0] !== '');

        if (existingNote) {
            const newProps = [...existingNote.properties.filter(p => !['location', 'altitude'].includes(p.key)), ...properties];
            return {
                ...existingNote,
                properties: newProps,
                updatedAt: timestamp
            };
        }

        return {
            id: this.getNodeNoteId(nodeId),
            title: `Node ${nodeId}`,
            content: `Meshtastic Node ${nodeId}`,
            tags: ['meshtastic', 'node'],
            properties,
            createdAt: timestamp,
            updatedAt: timestamp,
            source: {
                type: 'import',
                identifier: `meshtastic-node-${nodeId}`,
                timestamp: Date.now()
            },
            privacy: 'public',
            priority: 0.1,
            author: `mesh:${nodeId}`
        };
    }
}
