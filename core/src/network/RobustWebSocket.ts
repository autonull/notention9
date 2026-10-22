import { Logger } from '../utils/logging.js';

export interface RobustWebSocketOptions {
  url?: string;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
}

type EventHandler = (event: any) => void;

export class RobustWebSocket {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectInterval: number;
  private reconnectAttempts = 0;
  protected readonly logger = Logger.getInstance();
  private readonly handlers: {
    onOpen?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (event: Event) => void;
    onMessage?: (event: MessageEvent) => void;
  };
  private shouldReconnect = true;
  private eventListeners: Map<string, Set<EventHandler>> = new Map();

  constructor(options: RobustWebSocketOptions) {
    this.url = options.url || '';
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.reconnectInterval = options.reconnectInterval ?? 1000;
    this.handlers = {
      onOpen: options.onOpen,
      onClose: options.onClose,
      onError: options.onError,
      onMessage: options.onMessage
    };
  }

  async connect(url?: string): Promise<void> {
    const targetUrl = url || this.url;
    if (!targetUrl) throw new Error('No URL provided for WebSocket connection');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(targetUrl);
        this.setupEventHandlers(resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventHandlers(resolve: () => void, reject: (error: Error) => void): void {
    if (!this.ws) return;

    this.ws.onopen = (event) => {
      this.reconnectAttempts = 0;
      this.handlers.onOpen?.(event);
      this.emit('open', event);
      resolve();
    };

    this.ws.onclose = (event) => {
      this.handlers.onClose?.(event);
      this.emit('close', event);
      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), this.reconnectInterval * this.reconnectAttempts);
      }
    };

    this.ws.onerror = (event) => {
      this.handlers.onError?.(event);
      this.emit('error', event);
      reject(new Error('WebSocket error'));
    };

    this.ws.onmessage = (event) => {
      this.handlers.onMessage?.(event);
      this.emit('message', event);
    };
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close(code?: number, reason?: string): void {
    this.shouldReconnect = false;
    this.ws?.close(code, reason);
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get isOnlineMode(): boolean {
    return this.isConnected;
  }

  on(event: string, handler: EventHandler): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  private emit(event: string, data: any): void {
    this.eventListeners.get(event)?.forEach(handler => handler(data));
  }

  reconnect(): void {
    this.close();
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.connect();
  }
}