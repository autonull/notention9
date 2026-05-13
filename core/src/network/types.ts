import { Note, PrivacyLevel, OntologyNode } from '../types/index.js';
import { ScoredMatch } from './nostr/discovery.js';

export interface NetworkStatus {
    connected: boolean;
    details?: string;
    lastSeen?: number;
}

export interface NetworkProvider {
    id: string;
    name: string;
    enabled: boolean;

    /**
     * Initialize the provider
     */
    initialize(): Promise<void>;

    /**
     * Get current provider status
     */
    getStatus(): NetworkStatus;

    /**
     * Send a note over this network
     */
    sendNote(note: Note, ontology?: OntologyNode[]): Promise<void>;

    /**
     * Discover potential matches for a note on this network
     */
    discoverMatches(note: Note, ontology: OntologyNode[], privacyMode: PrivacyLevel): Promise<ScoredMatch[]>;

    /**
     * Check if provider is available in current environment
     */
    isSupported(): boolean;

    /**
     * Register an event listener
     */
    on(event: string, callback: (...args: any[]) => void): void;

    /**
     * Unregister an event listener
     */
    off(event: string, callback: (...args: any[]) => void): void;
}

export interface NetworkTransport {
    send(data: Uint8Array): Promise<void>;
    onData(callback: (data: Uint8Array, from: string) => void): void;
}

export interface NetworkRegistry {
    registerProvider(provider: NetworkProvider): void;
    getProvider(id: string): NetworkProvider | undefined;
    getAllProviders(): NetworkProvider[];
    getActiveProviders(): NetworkProvider[];
}
