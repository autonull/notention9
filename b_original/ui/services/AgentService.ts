import { ConnectionError } from '../utils/errors';

type Listener = (...args: any[]) => void;

interface QueuedMessage {
  data: any;
  timestamp: number;
  retries: number;
}

class AgentService {
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private listeners: Record<string, Listener[]> = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isOnlineMode = false;
  private messageQueue: QueuedMessage[] = [];
  private isProcessingQueue = false;
  private status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'offline' = 'disconnected';
  private lastError: string | null = null;

  async connect(url?: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      console.log('Already connecting to agent service');
      return;
    }

    const resolvedUrl = await this.resolveUrl(url);

    if (resolvedUrl) {
      // Attempt to connect to remote agent service
      this.status = 'connecting';
      this.isOnlineMode = true;
      this.url = resolvedUrl;

      try {
        this.ws = new WebSocket(resolvedUrl);
        this.setupWebSocketHandlers(resolvedUrl);
      } catch (error) {
        console.error('Failed to create WebSocket, falling back to offline mode', error);
        this.lastError = (error as Error).message;
        this.fallbackToOfflineMode();
      }
    } else {
      // No remote agent configured, operate in offline mode
      console.log('Operating in offline mode');
      this.fallbackToOfflineMode();
    }
  }

  private fallbackToOfflineMode(): void {
    this.isOnlineMode = false;
    this.status = 'offline';
    this.emit('status_change', { status: this.status, isOnline: this.isOnlineMode });
    this.emit('connected'); // Emit connected event for offline mode

    // Process any queued messages in offline mode
    this.processMessageQueue();
  }

  private async resolveUrl(url?: string): Promise<string | null> {
    if (url) return url;

    // Try to discover from config
    try {
      const res = await fetch('/agent-config.json');
      if (res.ok) {
        const config = await res.json();
        return config.wsUrl;
      }
    } catch (e) {
      console.warn('Failed to fetch agent config', e);
    }

    // Fallback to global variable
    if (typeof window !== 'undefined' && (window as any).AGENT_WS_URL) {
      return (window as any).AGENT_WS_URL;
    }

    return null;
  }

  private setupWebSocketHandlers(url: string): void {
    this.ws!.onopen = () => {
      console.log('Connected to Agent');
      this.reconnectAttempts = 0; // Reset attempts on successful connection
      this.isOnlineMode = true;
      this.status = 'connected';
      this.lastError = null;
      this.emit('status_change', { status: this.status, isOnline: this.isOnlineMode });
      this.emit('connected');

      // Process any queued messages
      this.processMessageQueue();
    };

    this.ws!.onmessage = (msg) => {
      try {
        const parsedData = JSON.parse(msg.data);
        this.emit('message', parsedData);

        // If this is a response to a queued message, remove it from queue
        if (parsedData.id && parsedData.type === 'response') {
          this.removeProcessedMessage(parsedData.id);
        }
      } catch (e) {
        console.error('Failed to parse agent message', e);
        this.emit('message', msg.data);
      }
    };

    this.ws!.onclose = (event) => {
      console.log(`Agent connection closed: ${event.code} - ${event.reason}`);
      this.isOnlineMode = false;
      this.ws = null;
      this.status = 'disconnected';
      this.emit('status_change', { status: this.status, isOnline: this.isOnlineMode });
      this.emit('disconnected');

      // Reconnect with exponential backoff if attempts are below max
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.status = 'reconnecting';
        this.emit('status_change', { status: this.status, isOnline: this.isOnlineMode });

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Max 30 seconds
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(url), delay);
      } else {
        console.log('Max reconnection attempts reached, staying in offline mode');
        this.fallbackToOfflineMode();
      }
    };

    this.ws!.onerror = (err) => {
      console.error('Agent connection error', err);
      this.lastError = err.toString();
      this.emit('error', { error: err, status: this.status });
    };
  }

  /**
   * Send data to the agent with retry logic
   */
  send(data: any): void {
    const message = {
      ...data,
      id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    if (this.isOnlineMode && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        this.emit('sent', message);
      } catch (error) {
        console.error('Failed to send message, queuing for retry', error);
        this.queueMessage(message);
      }
    } else {
      // Queue the message for when we're back online
      this.queueMessage(message);
    }
  }

  private queueMessage(message: any): void {
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      console.warn('Message queue too large, dropping oldest message');
      this.messageQueue.shift();
    }

    this.messageQueue.push({
      data: message,
      timestamp: Date.now(),
      retries: 0
    });

    console.log(`Message queued (${this.messageQueue.length} in queue)`);
    this.emit('queued', { message, queueSize: this.messageQueue.length });

    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      this.processMessageQueue();
    }
  }

  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.messageQueue.length > 0) {
        const queuedMsg = this.messageQueue[0];

        if (this.isOnlineMode && this.ws && this.ws.readyState === WebSocket.OPEN) {
          // Try to send the message
          try {
            this.ws.send(JSON.stringify(queuedMsg.data));
            this.messageQueue.shift(); // Remove successfully sent message
            this.emit('sent', queuedMsg.data);
          } catch (error) {
            console.error('Failed to send queued message', error);
            // Increment retry count
            queuedMsg.retries++;

            if (queuedMsg.retries > 3) {
              // Too many retries, remove from queue
              console.warn('Message failed after 3 retries, removing from queue', queuedMsg.data);
              this.messageQueue.shift();
            } else {
              // Wait a bit before trying again
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } else {
          // Still offline, wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private removeProcessedMessage(id: string): void {
    const index = this.messageQueue.findIndex(msg => msg.data.id === id);
    if (index !== -1) {
      this.messageQueue.splice(index, 1);
      console.log(`Removed processed message from queue: ${id}`);
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
    return this.isOnlineMode ? (this.ws !== null && this.ws.readyState === WebSocket.OPEN) : true;
  }

  isOnline(): boolean {
    return this.isOnlineMode;
  }

  isOffline(): boolean {
    return !this.isOnlineMode;
  }

  getStatus(): { status: string; isOnline: boolean; lastError: string | null; queueSize: number } {
    return {
      status: this.status,
      isOnline: this.isOnlineMode,
      lastError: this.lastError,
      queueSize: this.messageQueue.length
    };
  }

  /**
   * Force a reconnection attempt
   */
  async reconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
    }
    this.reconnectAttempts = 0;
    await this.connect();
  }

  /**
   * Clear the message queue
   */
  clearQueue(): void {
    this.messageQueue = [];
    this.emit('queue_cleared');
  }
}

export const agentService = new AgentService();
