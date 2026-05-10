import { NetworkProvider, NetworkTransport, NetworkStatus } from './types.js';
import { Note, PrivacyLevel, OntologyNode } from '../types/index.js';
import { ScoredMatch } from '../nostr/discovery.js';
import { MatchEngine } from '../matching/MatchEngine.js';
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
    private seenNotes = new Map<string, Note>();

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
        if (!this.enabled) return [];

        const engine = new MatchEngine(ontology);
        const matches: ScoredMatch[] = [];

        for (const seenNote of this.seenNotes.values()) {
            if (seenNote.id === note.id || seenNote.id === `mesh-${seenNote.author}-${note.id.slice(0, 8)}`) continue;

            const result = engine.calculateMatchScore(note, seenNote);
            if (result.score > 0.3) {
                matches.push({
                    note: seenNote,
                    result,
                    direction: 'outgoing'
                });
            }
        }

        this.logger.info(`Broadcasting discovery request for note ${note.id} over Meshtastic`);
        try {
            const request = this.serializeDiscoveryRequest(note);
            if (this._transport) {
                await this._transport.send(request);
            } else if (this.config.connectionType === 'server-proxy' && this.config.agentService) {
                if (this.config.agentService.meshSendPacket) {
                    await this.config.agentService.meshSendPacket(request);
                }
            }
        } catch (e) {
            this.logger.error("Failed to broadcast discovery request", e as Error);
        }

        return matches.sort((a, b) => b.result.score - a.result.score);
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
        const maxProperties = 5;
        const maxContentLength = 100;

        const content = note.content.length > maxContentLength
            ? note.content.slice(0, maxContentLength - 3) + '...'
            : note.content;

        const compact = {
            type: 'note',
            i: note.id.slice(0, 8),
            c: content,
            p: note.properties.slice(0, maxProperties).map(p => [p.key, p.operator, p.values]),
            a: note.author ? note.author.slice(0, 8) : undefined,
            t: Math.floor(new Date(note.createdAt).getTime() / 1000)
        };

        try {
            const encoded = encode(compact);
            if (encoded.byteLength > 230) {
                const minimal = {
                    type: 'note',
                    i: compact.i,
                    c: content.slice(0, 50) + '...',
                    t: compact.t
                };
                return encode(minimal);
            }
            return encoded;
        } catch (e) {
            this.logger.error("Failed to serialize note", e as Error);
            return encode({ type: 'note', i: compact.i, c: 'Error serializing note', t: compact.t });
        }
    }

    serializeDiscoveryRequest(note: Note): Uint8Array {
        const compact = {
            type: 'discover',
            i: note.id.slice(0, 8),
            p: note.properties.slice(0, 10).map(p => [p.key, p.operator, p.values]),
            t: Math.floor(Date.now() / 1000)
        };
        return encode(compact);
    }

    handleIncomingPacket(data: Uint8Array, fromNode: string) {
        try {
            const decoded = decode(data);
            if (!decoded || typeof decoded !== 'object') return;

            if (decoded.type === 'note' || (decoded.i && decoded.c)) {
                const note = this.mapToNote(decoded, fromNode);
                this.seenNotes.set(note.id, note);
                this.emit('note', note);
            } else if (decoded.type === 'discover') {
                this.emit('discovery_request', {
                    from: fromNode,
                    properties: (decoded.p || []).map((p: any) => ({
                        key: p[0],
                        operator: p[1],
                        values: p[2]
                    })),
                    noteId: decoded.i
                });
            }
        } catch (e) {
            this.logger.error("Failed to decode Meshtastic packet", e as Error);
            this.emit('error', { message: 'Packet decoding failed', from: fromNode });
        }
    }

    private mapToNote(data: any, fromNode: string): Note {
        const timestamp = new Date((data.t || Date.now() / 1000) * 1000).toISOString();
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

    handleTelemetry(nodeId: string, telemetry: any) {
        this.emit('telemetry', { nodeId, telemetry });
    }

    handlePosition(nodeId: string, position: any) {
        this.emit('position', { nodeId, position });
    }

    mapTelemetryToNote(nodeId: string, telemetry: any, existingNote?: Note): Note {
        const timestamp = new Date().toISOString();
        const properties = [
            { key: 'battery', operator: 'is', values: [String(telemetry.batteryLevel || '')] },
            { key: 'voltage', operator: 'is', values: [String(telemetry.voltage || '')] },
            { key: 'channel-utilization', operator: 'is', values: [String(telemetry.channelUtilization || '')] }
        ].filter(p => p.values[0] !== '');

        if (existingNote) {
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
