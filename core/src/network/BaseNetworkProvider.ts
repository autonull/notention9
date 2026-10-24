import { Logger } from '../utils/logging.js';
import type { NetworkStatus } from './types.js';

export interface NetworkProviderConfig {
    enabled?: boolean;
}

export abstract class BaseNetworkProvider {
    protected logger = Logger.getInstance();
    private listeners: Record<string, ((...args: any[]) => void)[]> = {};
    protected config: NetworkProviderConfig = {};

    get enabled(): boolean {
        return this.config.enabled ?? false;
    }

    set enabled(val: boolean) {
        const changed = this.config.enabled !== val;
        this.config.enabled = val;
        if (changed) {
            val ? this.subscribe() : this.unsubscribe();
            this.emit('status_change', this.getStatus());
        }
    }

    on(event: string, callback: (...args: any[]) => void): void {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    off(event: string, callback: (...args: any[]) => void): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(l => l !== callback);
    }

    protected emit(event: string, ...args: any[]): void {
        const eventListeners = this.listeners[event];
        if (eventListeners) {
            eventListeners.forEach(fn => fn(...args));
        }
    }

    abstract getStatus(): NetworkStatus;
    abstract subscribe(): void;
    abstract unsubscribe(): void;

    isSupported(): boolean {
        return true;
    }

    async initialize(): Promise<void> {
        if (this.enabled) this.subscribe();
    }

    setConfig(config: Partial<NetworkProviderConfig>): void {
        const wasEnabled = this.enabled;
        this.config = { ...this.config, ...config };
        if (wasEnabled !== this.enabled) {
            this.enabled ? this.subscribe() : this.unsubscribe();
        }
        this.emit('status_change', this.getStatus());
    }
}