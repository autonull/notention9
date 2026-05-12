import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    Note,
    networkRegistry,
    NostrNetworkProvider,
    MatchingService,
    DEFAULT_ONTOLOGY
} from '../../index.js';

// Mocking pool to avoid actual network traffic but keeping the flow
vi.mock('../../nostr.js', async () => {
    const actual = await vi.importActual('../../nostr.js') as any;
    return {
        ...actual,
        pool: {
            subscribeMany: vi.fn((relays, filters, handlers) => {
                return { close: vi.fn() };
            }),
            publish: vi.fn(async (relays, event) => {
                return [];
            })
        },
        publishNoteToNostr: vi.fn(async (note, privkey, relays) => {
            // Simulate the event coming back via subscription
            const provider = networkRegistry.getProvider('nostr');
            if (provider) {
                // In a real scenario, the provider receives events from the pool
                // Here we manually trigger the emit for the test
                provider.emit('note', note);
            }
        })
    };
});

describe('Golden Path Integration', () => {
    let nostrProvider: NostrNetworkProvider;
    let matchingService: MatchingService;

    beforeEach(() => {
        nostrProvider = new NostrNetworkProvider({
            privkey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            relays: ['ws://localhost:4444'],
            enabled: true
        });
        networkRegistry.registerProvider(nostrProvider);
        matchingService = new MatchingService(DEFAULT_ONTOLOGY);
    });

    afterEach(() => {
        // Manually clear providers
        const registry = networkRegistry as any;
        if (registry.providers) {
            registry.providers.clear();
        }
        vi.clearAllMocks();
    });

    it('should coordinate a match between two notes over the network', async () => {
        const receivedNotes: Note[] = [];
        nostrProvider.on('note', (note) => {
            receivedNotes.push(note);
        });

        // 1. User A creates and "publishes" a request note
        const requestNote: Note = {
            id: 'note-1',
            title: 'I need pizza',
            content: 'I need a pizza [pizza:is:needed]',
            properties: [{ key: 'pizza', operator: 'is', values: ['needed'] }],
            tags: ['prop:pizza'],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            author: 'nostr:user-a',
            privacy: 'public'
        };

        await nostrProvider.sendNote(requestNote);

        // 2. Verify Note was "received" (simulated loopback)
        expect(receivedNotes.length).toBe(1);

        // 3. User B publishes an offer note
        const offerNote: Note = {
            id: 'note-2',
            title: 'I have pizza',
            content: 'I have a pizza [pizza:is:needed]',
            properties: [{ key: 'pizza', operator: 'is', values: ['needed'] }],
            tags: ['prop:pizza'],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            author: 'nostr:user-b',
            privacy: 'public'
        };

        await nostrProvider.sendNote(offerNote);
        expect(receivedNotes.length).toBe(2);

        // 4. Run Matching Service on the received notes
        const matches = receivedNotes
            .filter(n => n.id !== requestNote.id)
            .map(n => ({ note: n, ...matchingService.matchNotes(requestNote, n) }))
            .filter(m => m.score > 0);

        // 5. Verify the match
        expect(matches.length).toBeGreaterThan(0);
        const bestMatch = matches[0];
        expect(bestMatch.note.id).toBe('note-2');
    });
});
