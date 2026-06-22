import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publishNoteToNostr } from '../network/nostr/nostr.js';
import { Note, OntologyNode, NostrEvent } from '../types/index.js';
import { getPrivacyTags, hashValue } from '../network/nostr/privacy.js';
import { NetworkDiscoveryService } from '../network/nostr/discovery.js';
import { MatchEngine } from '../matching/MatchEngine.js';

// Hoist mocks
const { mockQueryEvents, mockPublish } = vi.hoisted(() => {
    return {
        mockQueryEvents: vi.fn(),
        mockPublish: vi.fn().mockReturnValue([Promise.resolve()])
    };
});

// Mock nostr-tools pool
vi.mock('../network/nostr/nostr.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        queryEvents: mockQueryEvents,
        pool: {
            publish: mockPublish
        }
    };
});

// Mock NetworkGate to always allow
vi.mock('../networkGate.js', () => {
    return {
        NetworkGate: class {
            canTransmit() { return Promise.resolve(true); }
        },
        PrivacyError: class extends Error { }
    };
});

describe('Nostr Phase 2.2 Privacy Levels', () => {

    const mockNote: Note = {
        id: 'note1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        properties: [
            { key: 'role', operator: 'is', values: ['engineer'] }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: { type: 'user', identifier: 'test', timestamp: Date.now() },
        privacy: 'public',
        priority: 1
    };

    it('should generate plaintext tags in public mode', async () => {
        const tags = await getPrivacyTags(mockNote.properties, 'public');
        expect(tags).toHaveLength(1);
        expect(tags[0]).toEqual(['property', 'role', 'is', 'engineer']);
    });

    it('should generate hashed tags in protected mode', async () => {
        const tags = await getPrivacyTags(mockNote.properties, 'protected');
        expect(tags).toHaveLength(1);
        expect(tags[0][0]).toBe('property-hash');
        expect(tags[0][1]).toBe('role');
        expect(tags[0][2]).not.toBe('engineer'); // Should be hashed

        // Check hash consistency
        if (typeof crypto !== 'undefined') {
            const expectedHash = await hashValue('engineer');
            expect(tags[0][2]).toBe(expectedHash);
        }
    });

    it('should generate secret tags in secret mode', async () => {
        const tags = await getPrivacyTags(mockNote.properties, 'private');
        expect(tags).toHaveLength(1);
        expect(tags[0][0]).toBe('property-secret');
        // Should NOT contain the key 'role'
        expect(tags[0]).not.toContain('role');

        if (typeof crypto !== 'undefined') {
            const expectedHash = await hashValue('role:engineer');
            expect(tags[0][1]).toBe(expectedHash);
        }
    });

});

describe('NetworkDiscoveryService Enhanced', () => {
    const ontology: OntologyNode[] = [
        {
            id: 'root',
            label: 'Root',
            attributes: {
                'skill': { type: 'string', description: 'Skill', operators: { real: ['is'], imaginary: [] } },
                'role': { type: 'string', description: 'Role', operators: { real: ['is'], imaginary: [] } }
            }
        }
    ];

    const engine = new MatchEngine(ontology);
    const service = new NetworkDiscoveryService(engine);

    beforeEach(() => {
        mockQueryEvents.mockReset();
    });

    it('should match outgoing requests (Local Request -> Remote Offer)', async () => {
        const localNote: Note = {
            id: 'local1',
            content: 'I need a JS dev',
            properties: [
                { key: 'role', operator: 'is', values: ['developer'] },
                { key: 'skill', operator: 'is', values: ['javascript'] }
            ],
            tags: [],
            publishedAt: '',
            createdAt: '',
            updatedAt: ''
        };

        const remoteEvent: NostrEvent = {
            id: 'remote1',
            pubkey: 'pk1',
            created_at: 1000,
            kind: 35000,
            tags: [
                ['t', 'prop:role'],
                ['t', 'prop:skill'],
                ['property', 'role', 'is', 'developer'],
                ['property', 'skill', 'is', 'javascript']
            ],
            content: 'I am a JS dev',
            sig: 'sig1'
        };

        mockQueryEvents.mockResolvedValue([remoteEvent]);

        const matches = await service.discoverMatches(localNote);

        expect(matches.length).toBe(1);
        expect(matches[0].direction).toBe('outgoing');
        expect(matches[0].result.score).toBeGreaterThan(0.8);
    });

    it('should match incoming requests (Local Offer -> Remote Request)', async () => {
        // Local Note is OFFERING skill
        const localNote: Note = {
            id: 'local1',
            content: 'I am a JS dev',
            properties: [
                { key: 'role', operator: 'is', values: ['developer'] },
                { key: 'skill', operator: 'is', values: ['javascript'] }
            ],
            tags: [],
            publishedAt: '',
            createdAt: '',
            updatedAt: ''
        };

        // Remote Note is REQUESTING skill
        const remoteEvent: NostrEvent = {
            id: 'remote1',
            pubkey: 'pk1',
            created_at: 1000,
            kind: 35000,
            tags: [
                ['t', 'prop:role'],
                ['t', 'prop:skill'],
                ['property', 'role', 'is', 'developer'],
                ['property', 'skill', 'is', 'javascript']
            ],
            content: 'I need a JS dev',
            sig: 'sig1'
        };

        mockQueryEvents.mockResolvedValue([remoteEvent]);

        const matches = await service.discoverMatches(localNote);

        expect(matches.length).toBe(1);
        expect(matches[0].result.score).toBeGreaterThan(0.8);
    });
});
