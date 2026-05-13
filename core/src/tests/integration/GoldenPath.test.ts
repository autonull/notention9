import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    Note,
    networkRegistry,
    NostrNetworkProvider,
    MatchingService,
    DEFAULT_ONTOLOGY,
    createNote
} from '../../index.js';

// Mocking pool to avoid actual network traffic but keeping the flow
vi.mock('../../network/nostr/nostr.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        pool: {
            subscribeMany: vi.fn(() => ({ close: vi.fn() })),
            publish: vi.fn(() => [])
        },
        publishNoteToNostr: vi.fn(async (note) => {
            // Manual loopback for the test
            setTimeout(() => {
                const provider = networkRegistry.getProvider('nostr');
                if (provider) {
                    provider.emit('note', note);
                }
            }, 0);
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
        const requestNote = createNote({
            id: 'note-1',
            title: 'I need pizza',
            content: 'I need a pizza [pizza:is:needed]',
            properties: [{ key: 'pizza', operator: 'is', values: ['needed'] }],
            tags: ['prop:pizza'],
            author: 'nostr:user-a',
            privacy: 'public'
        });

        await nostrProvider.sendNote(requestNote);

        // Wait for loopback
        await new Promise(resolve => setTimeout(resolve, 10));

        // 2. Verify Note was "received" (simulated loopback)
        expect(receivedNotes.length).toBe(1);

        // 3. User B publishes an offer note
        const offerNote = createNote({
            id: 'note-2',
            title: 'I have pizza',
            content: 'I have a pizza [pizza:is:needed]',
            properties: [{ key: 'pizza', operator: 'is', values: ['needed'] }],
            tags: ['prop:pizza'],
            author: 'nostr:user-b',
            privacy: 'public'
        });

        await nostrProvider.sendNote(offerNote);
        await new Promise(resolve => setTimeout(resolve, 10));
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
