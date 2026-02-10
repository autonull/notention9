import { describe, it, expect, vi } from 'vitest';
import { publishNoteToNostr } from '../nostr.js';
import { Note } from '../types/index.js';
import { getPrivacyTags, hashValue } from '../nostr/privacy.js';

// Mock nostr-tools pool
vi.mock('../nostr.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        pool: {
            publish: vi.fn().mockReturnValue([Promise.resolve()])
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
