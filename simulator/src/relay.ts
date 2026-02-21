import { WebSocketServer, WebSocket } from 'ws';
import { NostrEvent } from '@notention/core';
import { Filter } from 'nostr-tools';

interface Subscription {
    id: string;
    filters: Filter[];
    ws: WebSocket;
}

export class LocalRelay {
    private readonly wss: WebSocketServer;
    private readonly events: NostrEvent[] = [];
    private subs: Subscription[] = [];

    constructor(port: number = 4444) {
        this.wss = new WebSocketServer({ port });

        this.wss.on('connection', (ws) => {
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    this.handleMessage(ws, data);
                } catch (e) {
                    console.error('Relay error:', e);
                }
            });

            ws.on('close', () => {
                this.subs = this.subs.filter(s => s.ws !== ws);
            });
        });

        console.log(`Local Relay running on ws://localhost:${port}`);
    }

    private handleMessage(ws: WebSocket, [type, ...payload]: any[]) {
        switch (type) {
            case 'EVENT': {
                const event = payload[0] as NostrEvent;
                this.publishEvent(event);
                ws.send(JSON.stringify(['OK', event.id, true, 'saved']));
                break;
            }
            case 'REQ': {
                const subId = payload[0] as string;
                const filters = payload.slice(1) as Filter[];
                this.subscribe(ws, subId, filters);
                break;
            }
            case 'CLOSE': {
                const subId = payload[0] as string;
                this.subs = this.subs.filter(s => s.ws !== ws || s.id !== subId);
                break;
            }
        }
    }

    private publishEvent(event: NostrEvent) {
        if (this.events.some(e => e.id === event.id)) return;
        this.events.push(event);

        this.subs
            .filter(sub => this.matchesFilters(event, sub.filters))
            .filter(sub => sub.ws.readyState === WebSocket.OPEN)
            .forEach(sub => sub.ws.send(JSON.stringify(['EVENT', sub.id, event])));
    }

    private subscribe(ws: WebSocket, subId: string, filters: Filter[]) {
        this.subs.push({ id: subId, filters, ws });

        this.events
            .filter(event => this.matchesFilters(event, filters))
            .forEach(event => ws.send(JSON.stringify(['EVENT', subId, event])));

        ws.send(JSON.stringify(['EOSE', subId]));
    }

    private matchesFilters(event: NostrEvent, filters: Filter[]): boolean {
        return filters.some(filter => {
            if (filter.ids && !filter.ids.includes(event.id)) return false;
            if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
            if (filter.authors && !filter.authors.includes(event.pubkey)) return false;

            // Tag filters check
            return Object.entries(filter)
                .filter(([key]) => key.startsWith('#'))
                .every(([key, values]) => {
                    const tagName = key.slice(1);
                    const tagValues = values as string[];
                    const eventTags = event.tags.filter(t => t[0] === tagName).map(t => t[1]);
                    return tagValues.some(v => eventTags.includes(v));
                });
        });
    }

    public stop() {
        this.wss.close();
    }
}
