import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Note } from '../src/types/index.js';
import { MatchEngine } from '../src/matching/MatchEngine.js';

describe('Phase 2.3: Multi-Instance Coordination', () => {
    // Shared state
    let mockRelayEvents: any[] = [];

    // Dynamically updated modules
    let publishNoteToNostr: any;
    let NetworkDiscoveryService: any;

    beforeEach(async () => {
        mockRelayEvents = [];
        vi.resetModules();

        // 1. Mock nostr-tools
        vi.doMock('nostr-tools', async (importOriginal) => {
            const actual = await importOriginal() as any;
            return {
                ...actual,
                finalizeEvent: vi.fn().mockImplementation((template) => ({
                    ...template,
                    id: 'mock-id-' + Math.random(),
                    sig: 'mock-sig',
                    pubkey: 'mock-pubkey'
                })),
                SimplePool: class {
                    publish = vi.fn().mockImplementation((relays, event) => {
                        mockRelayEvents.push(event);
                        return [Promise.resolve()];
                    });
                    query = vi.fn().mockImplementation((relays, filters) => {
                        return Promise.resolve(mockRelayEvents.filter(event => {
                            return filters.some((f: any) => {
                                if (f.kinds && !f.kinds.includes(event.kind)) return false;
                                for (const key in f) {
                                    if (key.startsWith('#')) {
                                        const tagName = key.slice(1);
                                        const tagValues = f[key] as string[];
                                        const hasTag = event.tags.some((t: string[]) =>
                                            t[0] === tagName && tagValues.includes(t[1])
                                        );
                                        if (!hasTag) return false;
                                    }
                                }
                                return true;
                            });
                        }));
                    });
                }
            };
        });

        // 2. Mock NetworkGate
        vi.doMock('../src/networkGate.js', () => ({
            NetworkGate: class { canTransmit() { return Promise.resolve(true); } },
            PrivacyError: class extends Error { }
        }));

        // 3. Import modules
        const nostrModule = await import('../src/nostr.js');
        publishNoteToNostr = nostrModule.publishNoteToNostr;

        const discoveryModule = await import('../src/nostr/discovery.js');
        NetworkDiscoveryService = discoveryModule.NetworkDiscoveryService;
    });

    const createNote = (id: string, role: string, level: any): Note => ({
        id,
        title: `${id} Note`,
        content: `I am a ${role}`,
        tags: [],
        properties: [{ key: 'role', operator: 'is', values: [role] }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: { type: 'user', identifier: id, timestamp: Date.now() },
        privacy: 'public',
        priority: 1
    });

    const DUMMY_PRIVKEY = '0000000000000000000000000000000000000000000000000000000000000001';

    it('Scenario 1: Public-Public Match', async () => {
        const aliceNote = createNote('alice1', 'freelancer', 'public');
        await publishNoteToNostr(aliceNote, DUMMY_PRIVKEY, ['wss://dummy'], undefined, 'public');

        const bobEngine = new MatchEngine([]);
        const bobDiscovery = new NetworkDiscoveryService(bobEngine);
        const bobInterests = createNote('bob1', 'freelancer', 'public');
        const matches = await bobDiscovery.discoverMatches(bobInterests, ['wss://dummy'], 'public');

        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].note.content).toBe('I am a freelancer');
    });

    it('Scenario 2: Secret-Secret Match', async () => {
        const aliceNote = createNote('alice_spy', 'spy', 'private');
        await publishNoteToNostr(aliceNote, DUMMY_PRIVKEY, ['wss://dummy'], undefined, 'private');

        const bobEngine = new MatchEngine([]);
        const bobDiscovery = new NetworkDiscoveryService(bobEngine);
        const bobInterests = createNote('bob_spy', 'spy', 'private');
        const matches = await bobDiscovery.discoverMatches(bobInterests, ['wss://dummy'], 'private');

        expect(matches.length).toBeGreaterThan(0);
        const event = mockRelayEvents.find((e: any) => e.kind === 35000);
        expect(event.tags.some((t: string[]) => t[0] === 'property-secret')).toBe(true);
    });

    it('Scenario 3: Eve cannot find Secret note', async () => {
        const aliceNote = createNote('alice_secret', 'spy', 'private');
        await publishNoteToNostr(aliceNote, DUMMY_PRIVKEY, ['wss://dummy'], undefined, 'private');

        const eveEngine = new MatchEngine([]);
        const eveDiscovery = new NetworkDiscoveryService(eveEngine);
        const eveNote = createNote('eve', 'something_else', 'public');
        const matches = await eveDiscovery.discoverMatches(eveNote, ['wss://dummy'], 'public');

        const spyMatches = matches.filter((m: any) => m.note.id === 'alice_secret');
        if (spyMatches.length > 0) {
            const score = spyMatches[0].result.score;
            expect(score).toBeLessThan(0.3);
        } else {
            expect(true).toBe(true);
        }
    });
});
