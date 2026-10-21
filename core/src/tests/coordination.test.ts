import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Note } from '../types/index.js';
import { MatchEngine } from '../matching/MatchEngine.js';
import { createNote } from '../notes/notes.js';

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

                    subscribeMap = vi.fn().mockImplementation((requests, callbacks) => {
                         const filters = requests.map((r: any) => r.filter);

                         const results = mockRelayEvents.filter(event => {
                             return filters.some((f: any) => {
                                 if (f.kinds && !f.kinds.includes(event.kind)) return false;

                                 for (const key in f) {
                                     if (key.startsWith('#')) {
                                         const tagName = key.slice(1);
                                         const tagValues = f[key] as string[];
                                         const hasTag = event.tags?.some((t: string[]) =>
                                             t[0] === tagName && tagValues.includes(t[1])
                                         );
                                         if (!hasTag) return false;
                                     }
                                 }
                                 return true;
                             });
                         });

                         setTimeout(() => {
                             results.forEach((e: any) => callbacks.onevent(e));
                             if (callbacks.oneose) callbacks.oneose();
                         }, 0);

                         return { close: () => {} };
                    });

                    subscribeMany = vi.fn().mockImplementation((relays, filters, callbacks) => {
                        // Legacy fallback logic if needed
                        return { close: () => {} };
                    });
                }
            };
        });

        // 2. Mock NetworkGate
        vi.doMock('../networkGate.js', () => ({
            NetworkGate: class { canTransmit() { return Promise.resolve(true); } },
            PrivacyError: class extends Error { }
        }));

        // 3. Import modules
        const nostrModule = await import('../network/nostr/nostr.js');
        publishNoteToNostr = nostrModule.publishNoteToNostr;

        const discoveryModule = await import('../network/nostr/discovery.js');
        NetworkDiscoveryService = discoveryModule.NetworkDiscoveryService;
    });

    const roleNote = (id: string, role: string) =>
        createNote({
            id,
            title: `${id} Note`,
            content: `I am a ${role}`,
            properties: [{ key: 'role', operator: 'is', values: [role] }],
            privacy: 'public',
        });

    const DUMMY_PRIVKEY = '0000000000000000000000000000000000000000000000000000000000000001';

    it('Scenario 1: Public-Public Match', async () => {
        const aliceNote = roleNote('alice1', 'freelancer');
        await publishNoteToNostr(aliceNote, DUMMY_PRIVKEY, ['wss://dummy'], undefined, 'public');

        const bobEngine = new MatchEngine([]);
        const bobDiscovery = new NetworkDiscoveryService(bobEngine);
        const bobInterests = roleNote('bob1', 'freelancer');
        const matches = await bobDiscovery.discoverMatches(bobInterests, ['wss://dummy'], 'public');

        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].note.content).toBe('I am a freelancer');
    });

    it('Scenario 2: Secret-Secret Match', async () => {
        const aliceNote = roleNote('alice_spy', 'spy');
        await publishNoteToNostr(aliceNote, DUMMY_PRIVKEY, ['wss://dummy'], undefined, 'private');

        const bobEngine = new MatchEngine([]);
        const bobDiscovery = new NetworkDiscoveryService(bobEngine);
        const bobInterests = roleNote('bob_spy', 'spy');
        const matches = await bobDiscovery.discoverMatches(bobInterests, ['wss://dummy'], 'private');

        expect(matches.length).toBeGreaterThan(0);
        const event = mockRelayEvents.find((e: any) => e.kind === 35000);
        expect(event.tags.some((t: string[]) => t[0] === 'property-secret')).toBe(true);
    });

    it('Scenario 3: Eve cannot find Secret note', async () => {
        const aliceNote = roleNote('alice_secret', 'spy');
        await publishNoteToNostr(aliceNote, DUMMY_PRIVKEY, ['wss://dummy'], undefined, 'private');

        const eveEngine = new MatchEngine([]);
        const eveDiscovery = new NetworkDiscoveryService(eveEngine);
        const eveNote = roleNote('eve', 'something_else');
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
