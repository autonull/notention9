import { WebSocketServer, WebSocket } from 'ws';
import { NostrEvent } from '@notention/core';

interface Subscription {
    id: string;
    filters: any[];
    ws: WebSocket;
}

export class LocalRelay {
    private wss: WebSocketServer;
    private events: NostrEvent[] = [];
    private subs: Subscription[] = [];

    constructor(port: number = 4444) {
        this.wss = new WebSocketServer({ port });

        this.wss.on('connection', (ws) => {
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    this.handleMessage(ws, data);
                } catch (e) {
                    console.error('Relay error parsing message:', e);
                }
            });

            ws.on('close', () => {
                this.subs = this.subs.filter(s => s.ws !== ws);
            });
        });

        console.log(`Local Relay running on ws://localhost:${port}`);
    }

    private handleMessage(ws: WebSocket, data: any[]) {
        const [type, ...payload] = data;

        if (type === 'EVENT') {
            const event = payload[0] as NostrEvent;
            this.publishEvent(event);
            ws.send(JSON.stringify(['OK', event.id, true, 'saved']));
        } else if (type === 'REQ') {
            const subId = payload[0] as string;
            const filters = payload.slice(1);
            this.subscribe(ws, subId, filters);
        } else if (type === 'CLOSE') {
            const subId = payload[0] as string;
            this.subs = this.subs.filter(s => s.ws !== ws || s.id !== subId);
        }
    }

    private publishEvent(event: NostrEvent) {
        // Simple deduplication
        if (this.events.some(e => e.id === event.id)) return;

        this.events.push(event);

        // Notify subscribers
        this.subs.forEach(sub => {
            if (this.matchesFilters(event, sub.filters)) {
                if (sub.ws.readyState === WebSocket.OPEN) {
                    sub.ws.send(JSON.stringify(['EVENT', sub.id, event]));
                }
            }
        });
    }

    private subscribe(ws: WebSocket, subId: string, filters: any[]) {
        this.subs.push({ id: subId, filters, ws });

        // Send existing events
        this.events.forEach(event => {
            if (this.matchesFilters(event, filters)) {
                ws.send(JSON.stringify(['EVENT', subId, event]));
            }
        });

        ws.send(JSON.stringify(['EOSE', subId]));
    }

    private matchesFilters(event: NostrEvent, filters: any[]): boolean {
        return filters.some(filter => {
            if (filter.ids && !filter.ids.includes(event.id)) return false;
            if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
            if (filter.authors && !filter.authors.includes(event.pubkey)) return false;

            // Tag filters
            for (const key in filter) {
                if (key.startsWith('#')) {
                    const tagName = key.slice(1);
                    const tagValues = filter[key] as string[];
                    const eventTags = event.tags.filter(t => t[0] === tagName).map(t => t[1]);
                    if (!tagValues.some(v => eventTags.includes(v))) return false;
                }
            }

            return true;
        });
    }

    public stop() {
        this.wss.close();
    }
}
