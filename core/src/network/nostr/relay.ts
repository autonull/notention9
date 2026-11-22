import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { matchFilters, verifyEvent, type Event, type Filter } from 'nostr-tools';

export interface RelayLimits {
    maxEventBytes: number;
    maxSubscriptions: number;
    maxFiltersPerSubscription: number;
    maxEvents: number;
}

const DEFAULT_LIMITS: RelayLimits = {
    maxEventBytes: 64 * 1024,
    maxSubscriptions: 20,
    maxFiltersPerSubscription: 10,
    maxEvents: 10_000,
};

interface Subscription {
    filters: Filter[];
}

export interface RelayOptions {
    port?: number;
    host?: string;
    path?: string;
    server?: HttpServer;
    limits?: Partial<RelayLimits>;
    /** Accept TEST-CLEAR for test isolation. Never enable on a public relay. */
    allowTestReset?: boolean;
}

type NostrMessage = [string, ...unknown[]];

const send = (ws: WebSocket, message: NostrMessage) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
};

export class NostrRelay {
    private readonly wss: WebSocketServer;
    private readonly events = new Map<string, Event>();
    private readonly subscriptions = new Map<WebSocket, Map<string, Subscription>>();
    private readonly limits: RelayLimits;
    private readonly ownsServer: boolean;
    private readonly host: string;
    private readonly path: string;
    private readonly requestedPort: number;
    private readonly allowTestReset: boolean;
    #url: string;

    constructor(options: RelayOptions = {}) {
        this.limits = { ...DEFAULT_LIMITS, ...options.limits };
        this.allowTestReset = options.allowTestReset === true;
        this.path = options.path === '/' ? '' : options.path ?? '';
        this.host = options.host ?? '127.0.0.1';
        this.requestedPort = options.port ?? 7000;
        this.ownsServer = !options.server;
        const path = options.path ?? '/';

        this.wss = options.server
            ? new WebSocketServer({ server: options.server, path })
            : new WebSocketServer({ port: this.requestedPort, host: this.host, path });

        this.#url = this.#buildUrl();
        this.wss.once('listening', () => {
            this.#url = this.#buildUrl();
        });
        this.wss.on('connection', ws => this.handleConnection(ws));
    }

    /** Current relay URL. A `port: 0` relay reports its bound port once listening. */
    get url(): string {
        return this.#url;
    }

    /** Resolves once the relay is listening, with the final URL. */
    start(): Promise<string> {
        if (this.wss.address()) return Promise.resolve(this.url);
        return new Promise((resolve, reject) => {
            this.wss.once('listening', () => resolve(this.url));
            this.wss.once('error', reject);
        });
    }

    #buildUrl(): string {
        const address = this.wss.address();
        const port = typeof address === 'object' && address ? address.port : this.requestedPort;
        return `ws://${this.host}:${port}${this.path}`;
    }

    async close(): Promise<void> {
        this.subscriptions.clear();
        for (const client of this.wss.clients) client.close(1001, 'relay shutting down');
        await new Promise<void>(resolve => this.wss.close(() => resolve()));
    }

    stop(): void {
        this.close();
    }

    /** Clear all stored events (for test isolation) */
    clearEvents(): void {
        this.events.clear();
    }

    private handleConnection(ws: WebSocket) {
        this.subscriptions.set(ws, new Map());

        ws.on('message', data => {
            const dataLength = data instanceof ArrayBuffer ? data.byteLength : Buffer.isBuffer(data) ? data.length : data.reduce((acc, buf) => acc + buf.length, 0);
            if (dataLength > this.limits.maxEventBytes) {
                send(ws, ['NOTICE', 'message too large']);
                return;
            }
            try {
                const message = JSON.parse(data.toString()) as NostrMessage;
                this.handleMessage(ws, message);
            } catch {
                send(ws, ['NOTICE', 'invalid message']);
            }
        });

        ws.on('close', () => this.subscriptions.delete(ws));
        ws.on('error', () => this.subscriptions.delete(ws));
    }

    private handleMessage(ws: WebSocket, [type, ...rest]: NostrMessage) {
        switch (type) {
            case 'EVENT':
                this.handleEvent(ws, rest[0] as Event);
                break;
            case 'REQ':
                this.handleRequest(ws, rest[0] as string, rest.slice(1) as Filter[]);
                break;
            case 'CLOSE':
                this.subscriptions.get(ws)?.delete(rest[0] as string);
                break;
            case 'TEST-CLEAR':
                if (!this.allowTestReset) {
                    send(ws, ['NOTICE', 'unsupported message: TEST-CLEAR']);
                    break;
                }
                this.clearEvents();
                send(ws, ['OK', 'cleared', true, '']);
                break;
            default:
                send(ws, ['NOTICE', `unsupported message: ${String(type)}`]);
        }
    }

    private handleEvent(ws: WebSocket, event: Event) {
        if (!event || typeof event.id !== 'string' || typeof event.kind !== 'number') {
            send(ws, ['OK', event?.id ?? '', false, 'invalid: malformed event']);
            return;
        }
        if (!verifyEvent(event)) {
            send(ws, ['OK', event.id, false, 'invalid: bad signature or id']);
            return;
        }
        if (this.events.has(event.id)) {
            send(ws, ['OK', event.id, true, 'duplicate: already stored']);
            return;
        }

        this.store(event);
        send(ws, ['OK', event.id, true, '']);
        this.broadcast(event);
    }

    private store(event: Event) {
        this.events.set(event.id, event);
        if (this.events.size <= this.limits.maxEvents) return;
        const oldest = [...this.events.values()].sort((a, b) => a.created_at - b.created_at)[0];
        if (oldest) this.events.delete(oldest.id);
    }

    private handleRequest(ws: WebSocket, subId: string, filters: Filter[]) {
        if (typeof subId !== 'string' || subId.length === 0 || subId.length > 64) {
            send(ws, ['NOTICE', 'invalid subscription id']);
            return;
        }
        const own = this.subscriptions.get(ws);
        if (!own) return;

        if (own.size >= this.limits.maxSubscriptions && !own.has(subId)) {
            send(ws, ['CLOSED', subId, 'error: too many subscriptions']);
            return;
        }
        if (filters.length === 0 || filters.length > this.limits.maxFiltersPerSubscription) {
            send(ws, ['CLOSED', subId, 'error: invalid filter count']);
            return;
        }

        own.set(subId, { filters });

        const matching = [...this.events.values()]
            .filter(event => matchFilters(filters, event))
            .sort((a, b) => b.created_at - a.created_at)
            .slice(0, 500);

        matching.forEach(event => send(ws, ['EVENT', subId, event]));
        send(ws, ['EOSE', subId]);
    }

    private broadcast(event: Event) {
        for (const [ws, subs] of this.subscriptions) {
            for (const [subId, { filters }] of subs) {
                if (matchFilters(filters, event)) send(ws, ['EVENT', subId, event]);
            }
        }
    }
}