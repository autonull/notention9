import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface BridgeConfig {
    host?: string;
    port?: number;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

export type BridgeEvent = 'connected' | 'disconnected' | 'error' | 'message';

export class MoltBotBridge extends EventEmitter {
    private ws: WebSocket | null = null;
    private config: BridgeConfig;
    private reconnectAttempts = 0;
    private isExplicitlyClosed = false;
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor(config: BridgeConfig = {}) {
        super();
        this.config = {
            host: config.host || '127.0.0.1',
            port: config.port || 18789,
            reconnectInterval: config.reconnectInterval || 3000,
            maxReconnectAttempts: config.maxReconnectAttempts || 10
        };
    }

    async connect(): Promise<void> {
        this.isExplicitlyClosed = false;
        const url = `ws://${this.config.host}:${this.config.port}`;
        console.log(`[Bridge] Connecting to MoltBot at ${url}...`);

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);

                this.ws.on('open', () => {
                    console.log('[Bridge] Connected to MoltBot Gateway');
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.emit('connected');
                    resolve();
                });

                this.ws.on('message', (data: WebSocket.Data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(message);
                    } catch (e: any) {
                        console.error('[Bridge] Failed to parse message:', e?.message || e);
                    }
                });

                this.ws.on('error', (error) => {
                    console.error('[Bridge] WebSocket error:', error.message);
                    this.emit('error', error);
                    // Don't reject here if it's already open, let close handle it
                    if (this.ws?.readyState === WebSocket.CONNECTING) {
                        reject(error);
                    }
                });

                this.ws.on('close', (code, reason) => {
                    console.log(`[Bridge] Disconnected (code: ${code}, reason: ${reason})`);
                    this.stopHeartbeat();
                    this.emit('disconnected');
                    this.ws = null;

                    if (!this.isExplicitlyClosed) {
                        this.scheduleReconnect();
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    async disconnect(): Promise<void> {
        this.isExplicitlyClosed = true;
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    async sendCommand(command: string, payload: any = {}): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Bridge is not connected');
        }

        const msg = JSON.stringify({
            command,
            ...payload,
            timestamp: Date.now()
        });

        this.ws.send(msg);
    }

    private handleMessage(message: any) {
        // Echo or process specific messages
        if (message.type === 'pong') return;

        this.emit('message', message);
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
            console.error('[Bridge] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        // Exponential backoff: double the delay with each attempt, capped at 30 seconds
        const baseDelay = this.config.reconnectInterval || 3000;
        const cappedDelay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Cap at 30 seconds
        const delay = Math.floor(cappedDelay);

        console.log(`[Bridge] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

        setTimeout(() => {
            this.connect().catch(() => {
                // Error already logged in connect()
            });
        }, delay);
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}
