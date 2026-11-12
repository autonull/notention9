import { NetworkTransport } from '../types.js';
import { Logger } from '../../utils/logging.js';

const logger = Logger.create('MeshBridgeTransport');

export interface MeshBridgeTransportConfig {
    url: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

export class MeshBridgeTransport implements NetworkTransport {
    private ws: WebSocket | null = null;
    private config: Required<MeshBridgeTransportConfig>;
    private dataCallback: ((data: Uint8Array, from: string) => void) | null = null;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isIntentionalDisconnect = false;

    constructor(config: MeshBridgeTransportConfig) {
        this.config = {
            url: config.url,
            reconnectInterval: config.reconnectInterval ?? 5000,
            maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
        };
    }

    static isSupported(): boolean {
        return typeof WebSocket !== 'undefined';
    }

    async connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        this.isIntentionalDisconnect = false;
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.url);

                this.ws.onopen = () => {
                    logger.info('Connected to mesh bridge');
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onclose = (event) => {
                    logger.info(`Mesh bridge connection closed: ${event.code} ${event.reason}`);
                    if (!this.isIntentionalDisconnect) {
                        this.scheduleReconnect();
                    }
                };

                this.ws.onerror = (event) => {
                    logger.error('Mesh bridge WebSocket error', new Error(`WebSocket error: ${event.type}`));
                    if (this.ws?.readyState !== WebSocket.OPEN) {
                        reject(new Error('Failed to connect to mesh bridge'));
                    }
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    private handleMessage(data: string | ArrayBuffer | Blob): void {
        if (!this.dataCallback) return;

        try {
            let message: any;
            if (typeof data === 'string') {
                message = JSON.parse(data);
            } else if (data instanceof ArrayBuffer) {
                message = JSON.parse(new TextDecoder().decode(data));
            } else if (data instanceof Blob) {
                // Handle blob asynchronously
                data.text().then(text => this.handleMessage(text)).catch(e => logger.error('Failed to read blob', e as Error));
                return;
            } else {
                return;
            }

            if (message.type === 'packet' && message.data) {
                const packetData = new Uint8Array(message.data);
                this.dataCallback(packetData, message.from ?? 'mesh-bridge');
            }
        } catch (e) {
            logger.error('Failed to parse mesh bridge message', e as Error);
        }
    }

    async send(data: Uint8Array): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Not connected to mesh bridge');
        }

        this.ws.send(JSON.stringify({
            type: 'send_packet',
            data: Array.from(data),
        }));
    }

    onData(callback: (data: Uint8Array, from: string) => void): void {
        this.dataCallback = callback;
    }

    async disconnect(): Promise<void> {
        this.isIntentionalDisconnect = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close(1000, 'Intentional disconnect');
            this.ws = null;
        }
        logger.info('Disconnected from mesh bridge');
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            logger.error('Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        logger.info(`Reconnecting to mesh bridge (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);

        this.reconnectTimer = setTimeout(() => {
            this.connect().catch(() => {});
        }, this.config.reconnectInterval);
    }

    getStatus(): { connected: boolean; reconnectAttempts: number } {
        return {
            connected: this.ws?.readyState === WebSocket.OPEN,
            reconnectAttempts: this.reconnectAttempts,
        };
    }
}

export function createMeshBridgeTransport(config: MeshBridgeTransportConfig): MeshBridgeTransport {
    return new MeshBridgeTransport(config);
}