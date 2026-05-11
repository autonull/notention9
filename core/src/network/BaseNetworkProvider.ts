import { Logger } from '../utils/logging.js';

/**
 * Base class for network providers to consolidate shared logic.
 */
export abstract class BaseNetworkProvider {
    protected logger = Logger.getInstance();
    private listeners: Record<string, ((...args: any[]) => void)[]> = {};

    /**
     * Register an event listener
     */
    on(event: string, callback: (...args: any[]) => void): void {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    /**
     * Unregister an event listener
     */
    off(event: string, callback: (...args: any[]) => void): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(l => l !== callback);
    }

    /**
     * Emit an event to all registered listeners
     */
    protected emit(event: string, ...args: any[]): void {
        const eventListeners = this.listeners[event];
        if (eventListeners) {
            eventListeners.forEach(fn => fn(...args));
        }
    }

    /**
     * Check if provider is available in current environment
     */
    isSupported(): boolean {
        return true;
    }
}
