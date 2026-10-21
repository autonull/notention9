import { WebSocket } from 'ws';
import chalk from 'chalk';
import {
    NostrEvent,
    MatchEngine,
    OntologyNode,
    Note,
    Property,
    convertEventToNote,
    getPrivacyTags,
    formatPropertyTag
} from '@notention/core';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';

export interface AgentProfile {
    name: string;
    role: string;
    properties: Property[];
    interests: Property[];
    traits: string[];
}

export class Agent {
    public readonly id: string;
    public readonly pubkey: string;
    #privkey: string;
    #engine: MatchEngine;
    #seenEvents = new Set<string>();
    #relay: WebSocket;

    public get secretKey(): string {
        return this.#privkey;
    }

    constructor(
        public readonly profile: AgentProfile,
        relayUrl: string,
        ontology: OntologyNode[],
        private readonly color: chalk.Chalk
    ) {
        const sk = generateSecretKey();
        this.#privkey = Buffer.from(sk).toString('hex');
        this.pubkey = getPublicKey(sk);
        this.id = this.pubkey.slice(0, 8);
        this.#engine = new MatchEngine(ontology);

        this.#relay = new WebSocket(relayUrl);
        this.#setupNetwork();
    }

    #setupNetwork() {
        this.#relay.on('open', () => {
            this.#log('Connected to relay');
            this.#subscribe();
        });

        this.#relay.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg[0] === 'EVENT') this.#handleEvent(msg[2]);
            } catch {
                // Ignore parse errors
            }
        });
    }

    #log(msg: string) {
        console.log(this.color(`[${this.profile.name}]: ${msg}`));
    }

    #subscribe() {
        if (this.#relay.readyState !== WebSocket.OPEN) return;

        const filter = {
            kinds: [1, 35000],
            limit: 50
        };
        this.#relay.send(JSON.stringify(['REQ', `sub-${this.id}`, filter]));
    }

    #handleEvent(event: NostrEvent) {
        if (this.#seenEvents.has(event.id) || event.pubkey === this.pubkey) return;
        this.#seenEvents.add(event.id);

        let note: Note;
        try {
            note = convertEventToNote(event);
        } catch (e) {
            this.#log(`Error converting event to note: ${e}`);
            return;
        }

        const myInterestsNote: Note = {
            ...note,
            id: `interest-${this.id}`,
            properties: this.profile.interests
        };

        const { score, matches } = this.#engine.calculateMatchScore(myInterestsNote, note);

        if (score > 0.5) {
            this.#log(`Matched event from ${event.pubkey.slice(0, 8)} (Score: ${score.toFixed(2)})`);
            matches.forEach(m => {
                this.#log(`  - Matched: ${m.requestProp.key} ${m.requestProp.operator} ${m.offerProp.values.join(', ')}`);
            });

            this.#publishExplanation(event.pubkey, score, matches);
        }
    }

    public async publishJob(inputMethod: string = 'raw') {
        const content = `Job: ${this.profile.role} needed. ` +
            this.profile.interests.map(formatPropertyTag).join(' ');
        await this.#publish(content, this.profile.interests, inputMethod);
    }

    public async publishOffer(inputMethod: string = 'raw') {
        const content = `Offer: I am a ${this.profile.role}. ` +
            this.profile.properties.map(formatPropertyTag).join(' ');
        await this.#publish(content, this.profile.properties, inputMethod);
    }

    public async sendMessage(targetId: string, message: string) {
        const content = `[@${targetId}] ${message}`;
        await this.#publish(content, [], 'chat');
    }

    async #createEvent(
        kind: number,
        content: string,
        tags: string[][]
    ): Promise<NostrEvent> {
        const sk = Uint8Array.from(Buffer.from(this.#privkey, 'hex'));
        return finalizeEvent({
            kind,
            created_at: Math.floor(Date.now() / 1000),
            tags,
            content,
        }, sk);
    }

    async #publishExplanation(matchedPubkey: string, score: number, details: any[]) {
        if (this.#relay.readyState !== WebSocket.OPEN) return;

        const explanation = {
            matcher: this.profile.name,
            matchedWith: matchedPubkey.slice(0, 8),
            score,
            details: details.map(d => ({
                request: `${d.requestProp.key} ${d.requestProp.operator}`,
                offer: d.offerProp.values.join(', '),
                score: d.score
            }))
        };

        const event = await this.#createEvent(
            35001,
            JSON.stringify(explanation),
            [['p', matchedPubkey]]
        );

        this.#relay.send(JSON.stringify(['EVENT', event]));
    }

    async #publish(content: string, properties: Property[], inputMethod: string = 'raw') {
        if (this.#relay.readyState !== WebSocket.OPEN) {
            this.#log('Relay not connected, cannot publish.');
            return;
        }

        const privacyTags = await getPrivacyTags(properties, 'public');
        const indexTags = properties.map(p => ['t', `prop:${p.key}`]);
        const methodTag = ['input-method', inputMethod];

        const event = await this.#createEvent(
            35000,
            content,
            [...privacyTags, ...indexTags, methodTag]
        );

        this.#relay.send(JSON.stringify(['EVENT', event]));
        this.#log(`Published: "${content.slice(0, 50)}..."`);
    }
}
