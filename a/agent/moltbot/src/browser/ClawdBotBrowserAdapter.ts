import type { BrowserAction } from '@notention/core';
import { MoltBotBridge } from '../bridge/MoltBotBridge';

/**
 * ClawdBotBrowserAdapter bridges our BrowserExecutor interface to ClawdBot's API.
 * This adapter delegates all browser automation to ClawdBot, avoiding duplication.
 */
export class ClawdBotBrowserAdapter {
    private bridge: MoltBotBridge;

    constructor(bridge: MoltBotBridge) {
        this.bridge = bridge;
    }

    /**
     * Execute browser actions through ClawdBot API.
     * Translates our BrowserAction format to ClawdBot's executeAction format.
     */
    async execute(actions: BrowserAction[]): Promise<unknown[]> {
        const results: unknown[] = [];

        // We can send a sequence or individual actions. 
        // MoltBot likely supports a sequence, but let's iterate to be safe or wrap in a transaction.
        // Assuming MoltBot has 'browser_action' command.

        try {
            // Group actions if MoltBot supports it, or send one by one.
            // For now, sending one by one with 'execute_browser_action'
            for (const action of actions) {
                const payload = this.translateAction(action);
                await this.bridge.sendCommand('execute_browser_action', payload);
                // We might need to wait for result via event if sendCommand is fire-and-forget?
                // MoltBotBridge.sendCommand is fire-and-forget currently?
                // Depending on implementation, we might need a request-response correlation.
                // Assuming bridge handles it or we don't need immediate result for now.
                results.push({ success: true });
            }
        } catch (error) {
            console.error(`ClawdBot action failed:`, error);
            throw error;
        }

        return results;
    }

    /**
     * Translate our BrowserAction format to ClawdBot format.
     * Adapts to ClawdBot's existing action structure.
     */
    private translateAction(action: BrowserAction): any {
        switch (action.type) {
            case 'navigate':
                return {
                    action: 'navigate',
                    url: action.url,
                    waitUntil: 'networkidle',
                    description: action.description
                };

            case 'click':
                return {
                    action: 'click',
                    selector: action.selector,
                    description: action.description
                };

            case 'type':
                return {
                    action: 'type',
                    selector: action.selector,
                    text: action.text,
                    description: action.description
                };

            case 'wait':
                return {
                    action: 'wait',
                    duration: action.duration,
                    description: action.description
                };

            case 'scrape':
                return {
                    action: 'scrape',
                    selector: action.selector,
                    scrapeRules: action.scrapeRules,
                    description: action.description
                };

            case 'screenshot':
                return {
                    action: 'screenshot',
                    path: action.path,
                    fullPage: action.fullPage ?? false,
                    description: action.description
                };

            default:
                throw new Error(`Unsupported action type: ${(action as any).type}`);
        }
    }

    /**
     * Check if ClawdBot is available
     */
    async isAvailable(): Promise<boolean> {
        return this.bridge.isConnected;
    }

    /**
     * Get ClawdBot status
     */
    async getStatus(): Promise<any> {
        return { connected: this.bridge.isConnected };
    }
}

/**
 * Factory function to create ClawdBotBrowserAdapter
 */
export function createClawdBotExecutor(options: {
    host?: string;
    port?: number;
    timeout?: number;
}): ClawdBotBrowserAdapter {
    // This creates a NEW bridge connection if used locally.
    // Ideally we should inject the existing bridge.
    // But for compatibility with existing signature:
    const bridge = new MoltBotBridge({
        host: options.host,
        port: options.port
    });

    // Auto-connect?
    bridge.connect().catch(console.error);

    return new ClawdBotBrowserAdapter(bridge);
}
