import { NetworkProvider } from './types.js';
import { Note, PrivacyLevel, OntologyNode } from '../types/index.js';
import {
    publishNoteToNostr,
    DEFAULT_RELAYS,
    convertEventToNote,
    pool,
    KIND_SEMANTIC_NOTE
} from '../nostr.js';
import { NetworkDiscoveryService, ScoredMatch } from '../nostr/discovery.js';
import { MatchEngine } from '../matching/MatchEngine.js';
import { Logger } from '../utils/logging.js';
import { getAliases } from '../ontologyHelpers.js';

export interface NostrConfig {
    privkey?: string | null;
    relays?: string[];
    enabled?: boolean;
}

export class NostrNetworkProvider implements NetworkProvider {
    readonly id = 'nostr';
    readonly name = 'Nostr';
    private logger = Logger.getInstance();
    private _onNote?: (note: Note) => void;

    constructor(private config: NostrConfig = {}) {}

    get enabled() {
        return this.config.enabled ?? !!this.config.privkey;
    }

    set enabled(val: boolean) {
        this.config.enabled = val;
    }

    async initialize(): Promise<void> {
    }

    async sendNote(note: Note, ontology?: OntologyNode[]): Promise<void> {
        if (!this.config.privkey || !this.enabled) return;

        const relays = this.config.relays || DEFAULT_RELAYS;

        const enhancedNote = { ...note, tags: [...note.tags] };
        if (ontology) {
            const propertyTags = new Set<string>();
            for (const prop of note.properties) {
                const aliases = getAliases(prop.key, ontology);
                aliases.forEach(alias => {
                    if (alias !== prop.key) {
                        propertyTags.add(`prop:${alias}`);
                    }
                });
            }
            propertyTags.forEach(tag => {
                if (!enhancedNote.tags.includes(tag)) {
                    enhancedNote.tags.push(tag);
                }
            });
        }

        await publishNoteToNostr(enhancedNote, this.config.privkey, relays);
    }

    async discoverMatches(note: Note, ontology: OntologyNode[], privacyMode: PrivacyLevel): Promise<ScoredMatch[]> {
        if (!this.enabled) return [];

        const relays = this.config.relays || DEFAULT_RELAYS;
        const engine = new MatchEngine(ontology);
        const discovery = new NetworkDiscoveryService(engine);

        return await discovery.discoverMatches(note, relays, privacyMode);
    }

    subscribe(onNote: (note: Note) => void): () => void {
        this._onNote = onNote;
        return () => {
            this._onNote = undefined;
        };
    }

    isSupported(): boolean {
        return true;
    }
}
