import { WebSocket } from 'ws';
import chalk from 'chalk';
import {
    NostrEvent,
    MatchEngine,
    OntologyNode,
    Note,
    Property,
    convertEventToNote,
    formatPropertyTag
} from '@notention/core';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';

export interface AgentProfile {
    name: string;
    role: string;
    properties: Property[]; // e.g. [role:is:developer], [skills:contains:react]
    interests: Property[]; // e.g. [job:is:developer], [rate:gt:100]
    traits: string[];
}

export class Agent {
    public id: string;
    public pubkey: string;
    private privkey: string;
    private relay: WebSocket;
    public profile: AgentProfile; // Make profile public
    private ontology: OntologyNode[];
    private engine: MatchEngine;
    private seenEvents: Set<string> = new Set();
    private color: chalk.Chalk;

    constructor(
        profile: AgentProfile,
        relayUrl: string,
        ontology: OntologyNode[],
        color: chalk.Chalk
    ) {
        const sk = generateSecretKey();
        this.privkey = Buffer.from(sk).toString('hex');
        this.pubkey = getPublicKey(sk);
        this.id = this.pubkey.slice(0, 8);
        this.profile = profile;
        this.ontology = ontology;
        this.color = color;
        this.engine = new MatchEngine(ontology);

        this.relay = new WebSocket(relayUrl);
        this.setupNetwork();
    }

    private setupNetwork() {
        this.relay.on('open', () => {
            this.log(`Connected to relay.`);
            this.subscribe();
        });

        this.relay.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg[0] === 'EVENT') {
                    this.handleEvent(msg[2]);
                }
            } catch (e) {
                // ignore
            }
        });
    }

    private log(msg: string) {
        console.log(this.color(`[${this.profile.name}]: ${msg}`));
    }

    private subscribe() {
        const filter = {
            kinds: [1, 35000], // Subscribe to text notes and semantic notes
            limit: 50
        };
        this.relay.send(JSON.stringify(['REQ', `sub-${this.id}`, filter]));
    }

    private handleEvent(event: NostrEvent) {
        if (this.seenEvents.has(event.id) || event.pubkey === this.pubkey) return;
        this.seenEvents.add(event.id);

        try {
            const note = convertEventToNote(event);

            // Create a dummy note representing agent's interests
            const myInterestsNote: Note = {
                ...note, // reuse structure
                id: 'interest-' + this.id,
                properties: this.profile.interests
            };

            const result = this.engine.calculateMatchScore(myInterestsNote, note);

            if (result.score > 0.5) { // Threshold
                 this.log(`Matched event from ${event.pubkey.slice(0, 8)} (Score: ${result.score.toFixed(2)})`);
                 // Log details
                 result.matches.forEach(m => {
                     this.log(`  - Matched: ${m.requestProp.key} ${m.requestProp.operator} ${m.offerProp.values.join(', ')}`);
                 });

                 // Auto-reply logic can be triggered here or by scenario
                 // For now, just log match
            }
        } catch (e) {
            this.log(`Error processing event: ${e}`);
        }
    }

    public async publishJob() {
        // Construct content based on properties
        const content = `Job: ${this.profile.role} needed. ` +
            this.profile.interests.map(p => `[${p.key}:${p.operator}:${p.values.join(',')}]`).join(' ');

        await this.publish(content, this.profile.interests); // Publish what I want (Job Request)
    }

    public async publishOffer() {
        // Construct content based on properties
        const content = `Offer: I am a ${this.profile.role}. ` +
            this.profile.properties.map(p => `[${p.key}:${p.operator}:${p.values.join(',')}]`).join(' ');

        await this.publish(content, this.profile.properties); // Publish what I have (Freelance Offer)
    }

    private async publish(content: string, properties: Property[]) {
        const sk = Uint8Array.from(Buffer.from(this.privkey, 'hex'));

        // Convert properties to tags
        const propertyTags = properties.map(p => {
             // We need to manually construct the tag format as extractPropertiesFromTags expects
             // ['property', key, op, val]
             // But wait, core/src/parsing.ts has formatPropertyTag -> [key:op:val] string
             // core/src/nostr.ts extractPropertiesFromTags -> parses ['property', key, op, val] Nostr tags

             // Let's stick to the convention in core/src/nostr.ts:
             // ['property', key, operator, value]
             // But values is array in Property. We should flatten or repeat?
             // core/src/nostr.ts: extractPropertiesFromTags handles repeated keys.
             // But values array?
             // extractPropertiesFromTags:
             // if (acc.has(key)) { acc.get(key)!.values.push(val); }
             // else { acc.set(key, { key, operator: op, values: [val] }); }

             // So for each value in p.values, we create a tag.
             return p.values.map(val => ['property', p.key, p.operator, val]);
        }).flat();

        const tags = [
            ...propertyTags
        ];

        const event = finalizeEvent({
            kind: 35000, // Semantic Note
            created_at: Math.floor(Date.now() / 1000),
            tags: tags,
            content: content,
        }, sk);

        if (this.relay.readyState === WebSocket.OPEN) {
            this.relay.send(JSON.stringify(['EVENT', event]));
            this.log(`Published: "${content.slice(0, 50)}..."`);
        } else {
            this.log(`Relay not connected, cannot publish.`);
        }
    }
}
