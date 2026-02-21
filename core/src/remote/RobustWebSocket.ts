import { Logger } from '../utils/logging.js';

type Listener = (...args: any[]) => void;

export interface QueuedMessage {
    data: any;
    timestamp: number;
    retries: number;
}

export interface RobustWebSocketOptions {
    maxReconnectAttempts?: number;
    pingInterval?: number;
    webSocketCtor?: any; // For Node.js environments (ws)
}

export class RobustWebSocket {
    protected ws: any | null = null;
    protected url: string | null = null;
    protected listeners: Record<string, Listener[]> = {};
    protected reconnectAttempts = 0;
    protected maxReconnectAttempts: number;
    protected isOnlineMode = false;
    protected messageQueue: QueuedMessage[] = [];
    protected isProcessingQueue = false;
    protected status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'offline' = 'disconnected';
    protected lastError: string | null = null;
    protected logger = Logger.getInstance();
    protected webSocketCtor: any;

    constructor(options: RobustWebSocketOptions = {}) {
        this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
        this.webSocketCtor = options.webSocketCtor || (typeof WebSocket !== 'undefined' ? WebSocket : null);
    }

    async connect(url: string): Promise<void> {
        if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) { // CONNECTING or OPEN
            this.logger.info('Already connecting or connected');
            return;
        }

        if (!this.webSocketCtor) {
            this.logger.error('No WebSocket implementation found');
            this.fallbackToOfflineMode();
            return;
        }

        this.url = url;
        this.status = 'connecting';
        this.isOnlineMode = true;

        try {
            this.ws = new this.webSocketCtor(url);
            this.setupWebSocketHandlers();
        } catch (error: any) {
            this.logger.error('Failed to create WebSocket, falling back to offline mode', error);
            this.lastError = error.message;
            this.fallbackToOfflineMode();
        }
    }

    protected fallbackToOfflineMode(): void {
        this.isOnlineMode = false;
        this.status = 'offline';
        this.emit('status_change', { status: this.status, isOnline: this.isOnlineMode });
        this.emit('connected'); // Emit connected event for offline mode logic compatibility

        // Process any queued messages in offline mode (if applicable, though usually they wait for online)
        // Subclasses might override this behavior
    }

    protected setupWebSocketHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            this.logger.info('Connected to WebSocket');
            this.reconnectAttempts = 0;
            this.isOnlineMode = true;
            this.status = 'connected';
            this.lastError = null;
            this.emit('status_change', { status: this.status, isOnline: this.isOnlineMode });
            this.emit('connected');

            this.processMessageQueue();
        };

        this.ws.onmessage = (msg: any) => {
            try {
                // Handle both browser (MessageEvent) and Node.js (Buffer/String)
                const dataStr = msg.data !== undefined ? msg.data : msg;
                const parsedData = JSON.parse(dataStr.toString());

                this.emit('message', parsedData);

                // If this is a response to a queued message, remove it from queue
                if (parsedData.id && parsedData.type === 'response') {
                    this.removeProcessedMessage(parsedData.id);
                }
            } catch (e: any) {
                this.logger.error('Failed to parse message', e);
                this.emit('message', msg.data || msg);
            }
        };

        this.ws.onclose = (event: any) => {
            this.logger.info(`Connection closed: ${event.code} - ${event.reason}`);
            this.isOnlineMode = false;
            this.ws = null;
            this.status = 'disconnected';
            this.emit('status_change', { status: this.status, isOnline: this.isOnlineMode });
            this.emit('disconnected');

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                this.status = 'reconnecting';
                this.emit('status_change', { status: this.status, isOnline: this.isOnlineMode });

                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                this.logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
                setTimeout(() => {
                    if (this.url) this.connect(this.url!);
                }, delay);
            } else {
                this.logger.info('Max reconnection attempts reached, staying in offline mode');
                this.fallbackToOfflineMode();
            }
        };

        this.ws.onerror = (err: any) => {
            this.logger.error('Connection error', err);
            this.lastError = err.toString();
            this.emit('error', { error: err, status: this.status });
        };
    }

    send(data: any): void {
        const message = {
            ...data,
            id: data.id || crypto.randomUUID(),
            timestamp: Date.now()
        };

        if (this.isOnlineMode && this.ws && this.ws.readyState === 1) { // OPEN
            try {
                this.ws.send(JSON.stringify(message));
                this.emit('sent', message);
            } catch (error) {
                this.logger.error('Failed to send message, queuing for retry', error as Error);
                this.queueMessage(message);
            }
        } else {
            this.queueMessage(message);
        }
    }

    protected queueMessage(message: any): void {
        if (this.messageQueue.length > 100) {
            this.logger.warn('Message queue too large, dropping oldest message');
            this.messageQueue.shift();
        }

        this.messageQueue.push({
            data: message,
            timestamp: Date.now(),
            retries: 0
        });

        this.emit('queued', { message, queueSize: this.messageQueue.length });

        if (!this.isProcessingQueue) {
            this.processMessageQueue();
        }
    }

    protected async processMessageQueue(): Promise<void> {
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return;
        }

        if (!this.isOnlineMode || !this.ws || this.ws.readyState !== 1) { // OPEN
            return;
        }

        this.isProcessingQueue = true;

        try {
            while (this.messageQueue.length > 0) {
                if (!this.isOnlineMode || !this.ws || this.ws.readyState !== 1) {
                    break;
                }

                const queuedMsg = this.messageQueue[0];

                try {
                    this.ws.send(JSON.stringify(queuedMsg.data));
                    this.messageQueue.shift();
                    this.emit('sent', queuedMsg.data);
                } catch (error) {
                    this.logger.error('Failed to send queued message', error as Error);
                    queuedMsg.retries++;

                    if (queuedMsg.retries > 3) {
                        this.logger.warn('Message failed after 3 retries, removing from queue', queuedMsg.data);
                        this.messageQueue.shift();
                    } else {
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                    }
                }
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    protected removeProcessedMessage(id: string): void {
        const index = this.messageQueue.findIndex(msg => msg.data.id === id);
        if (index !== -1) {
            this.messageQueue.splice(index, 1);
        }
    }

    on(event: string, fn: Listener): void {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
    }

    off(event: string, fn: Listener): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(listener => listener !== fn);
    }

    emit(event: string, ...args: any[]): void {
        const eventListeners = this.listeners[event];
        if (eventListeners) {
            eventListeners.forEach(fn => fn(...args));
        }
    }

    isConnected(): boolean {
        return this.isOnlineMode ? (this.ws !== null && this.ws.readyState === 1) : true; // In offline mode, we pretend to be "connected" to the app logic?
        // Actually, existing AgentService says: return this.isOnlineMode ? ... : true;
        // This suggests that "Connected" means "Ready to accept commands", even if offline (queued).
    }

    isOnline(): boolean {
        return this.isOnlineMode;
    }

    getStatus(): { status: string; isOnline: boolean; lastError: string | null; queueSize: number } {
        return {
            status: this.status,
            isOnline: this.isOnlineMode,
            lastError: this.lastError,
            queueSize: this.messageQueue.length
        };
    }

    async reconnect(): Promise<void> {
        if (this.ws) {
            try {
                this.ws.close();
            } catch (e) {
                this.logger.debug('WebSocket already closed or error during close', { error: e });
            }
        }
        this.reconnectAttempts = 0;
        if (this.url) {
            await this.connect(this.url);
        }
    }

    clearQueue(): void {
        this.messageQueue = [];
        this.emit('queue_cleared');
    }
}
