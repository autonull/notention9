import { WebSocket } from 'ws';
import chalk from 'chalk';
import ora from 'ora';
import {
    NostrEvent,
    MatchEngine,
    OntologyNode,
    DEFAULT_ONTOLOGY
} from '@notention/core';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';
import { LocalRelay } from './relay.js';

// --- Types ---

interface AgentProfile {
    name: string;
    role: string;
    interests: string[]; // Ontology keys/values they care about
    traits: string[];
}

// --- Ontology Helper ---

async function loadOntologies(): Promise<OntologyNode[]> {
    return DEFAULT_ONTOLOGY;
}

// --- Agent Implementation ---

class Agent {
    public id: string;
    public pubkey: string;
    private privkey: string;
    private relay: WebSocket;
    private profile: AgentProfile;
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
            this.startLifeLoop();
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
            kinds: [1],
            limit: 50
        };
        this.relay.send(JSON.stringify(['REQ', `sub-${this.id}`, filter]));
    }

    private handleEvent(event: NostrEvent) {
        if (this.seenEvents.has(event.id) || event.pubkey === this.pubkey) return;
        this.seenEvents.add(event.id);

        const eventTags = event.tags.map(t => t[1]);
        const match = this.profile.interests.some(interest =>
            event.content.toLowerCase().includes(interest.toLowerCase()) ||
            eventTags.includes(interest)
        );

        if (match) {
            this.log(`Matched event from ${event.pubkey.slice(0, 8)}: "${event.content.slice(0, 30)}..."`);
            if (Math.random() > 0.3) {
                this.reply(event);
            }
        }
    }

    private async reply(target: NostrEvent) {
        const replyContent = `Hey, I saw your note about ${this.profile.interests[0]}. I'm a ${this.profile.role} and can help!`;
        const sk = Uint8Array.from(Buffer.from(this.privkey, 'hex'));
        const event = finalizeEvent({
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['e', target.id], ['p', target.pubkey]],
            content: replyContent,
        }, sk);

        this.relay.send(JSON.stringify(['EVENT', event]));
        this.log(`Replied to ${target.pubkey.slice(0, 8)}`);
    }

    private startLifeLoop() {
        setInterval(() => {
            if (Math.random() > 0.7) {
                this.publishThought();
            }
        }, 5000 + Math.random() * 5000);
    }

    private publishThought() {
        const topics = ['Work', 'Life', 'Food', 'Code', 'Design'];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const content = `Thinking about ${topic} and ${this.profile.interests[0]}... #thought`;

        const sk = Uint8Array.from(Buffer.from(this.privkey, 'hex'));
        const event = finalizeEvent({
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['t', topic]],
            content: content,
        }, sk);

        this.relay.send(JSON.stringify(['EVENT', event]));
        this.log(`Published: "${content}"`);
    }
}

// --- Profiles ---

const PROFILES: AgentProfile[] = [
    { name: "Alice", role: "Developer", interests: ["code", "typescript", "rust", "freelance"], traits: ["curious"] },
    { name: "Bob", role: "Designer", interests: ["design", "ui", "ux", "art"], traits: ["creative"] },
    { name: "Charlie", role: "Manager", interests: ["product", "agile", "hiring"], traits: ["organized"] },
    { name: "Dave", role: "Recruiter", interests: ["hiring", "jobs", "resume"], traits: ["social"] },
    { name: "Eve", role: "Hacker", interests: ["security", "crypto", "privacy"], traits: ["suspicious"] },
];

// --- Main ---

async function main() {
    const relayPort = 4444;
    const relayUrl = `ws://localhost:${relayPort}`;

    // Start local relay
    const relay = new LocalRelay(relayPort);

    console.log(chalk.bold.cyan("\n🤖 Notention Agent Simulator (Dedicated Process) 🤖\n"));

    const spinner = ora('Loading Ontology...').start();
    const ontology = await loadOntologies();
    spinner.succeed(`Ontology Loaded (${ontology.length} root nodes)`);

    console.log(chalk.gray(`Relay listening on ${relayUrl}`));

    const agents: Agent[] = [];
    const colors = [chalk.red, chalk.green, chalk.yellow, chalk.blue, chalk.magenta, chalk.cyan];

    console.log(chalk.white("\nSpawning Agents...\n"));

    for (let i = 0; i < PROFILES.length; i++) {
        const profile = PROFILES[i];
        const color = colors[i % colors.length];
        const agent = new Agent(profile, relayUrl, ontology, color);
        agents.push(agent);
        await new Promise(r => setTimeout(r, 500)); // Stagger start
    }

    console.log(chalk.white("\nSimulation running. Press Ctrl+C to stop.\n"));

    process.on('SIGINT', () => {
        console.log(chalk.yellow("\nStopping simulation..."));
        relay.stop();
        process.exit();
    });
}

main().catch(console.error);
