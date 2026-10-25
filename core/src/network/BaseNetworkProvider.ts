import { Logger } from '../utils/logging.js';
import type { NetworkStatus } from './types.js';
import type { OntologyNode, Note, PrivacyLevel } from '../types/index.js';
import type { ScoredMatch } from '../matching/bidirectional.js';
import { MatchEngine } from '../matching/MatchEngine.js';

export interface NetworkProviderConfig {
    enabled?: boolean;
}

export interface DiscoveryOptions {
    note: Note;
    ontology: OntologyNode[];
    privacyMode: PrivacyLevel;
    threshold?: number;
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

    /**
     * Creates a MatchEngine instance for this provider's discovery operations.
     * Override to customize ontology or add provider-specific matching logic.
     */
    protected createMatchEngine(ontology: OntologyNode[]): MatchEngine {
        return new MatchEngine(ontology);
    }

    /**
     * Common discovery logic using MatchEngine.
     * Subclasses can override for provider-specific behavior.
     */
    protected async discoverWithEngine(
        options: DiscoveryOptions,
        localNotes: Note[]
    ): Promise<ScoredMatch[]> {
        if (!this.enabled || localNotes.length === 0) return [];

        const { note, ontology, privacyMode, threshold = 0.3 } = options;
        const engine = this.createMatchEngine(ontology);
        const matches: ScoredMatch[] = [];

        for (const seenNote of localNotes) {
            if (seenNote.id === note.id) continue;

            const result = engine.calculateMatchScore(note, seenNote);
            if (result.score > threshold) {
                matches.push({ note: seenNote, result, direction: 'outgoing' });
            }
        }

        return matches.sort((a, b) => b.result.score - a.result.score);
    }
}