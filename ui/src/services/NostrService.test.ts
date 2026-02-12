/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nostrService } from './NostrService';
import { publishNoteToNostr, getAliases, getCanonicalKey, Note } from '@notention/core';

// Mock dependencies
vi.mock('@notention/core', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        publishNoteToNostr: vi.fn(),
        getAliases: vi.fn(),
        getCanonicalKey: vi.fn(),
        // Mock other dependencies used in constructor or methods
        SimplePool: class {
            subscribeMany() { return { close: vi.fn() } }
            publish() { return [] }
        },
        convertEventToNote: vi.fn(),
        Logger: {
            getInstance: () => ({
                error: vi.fn(),
                warn: vi.fn(),
                info: vi.fn(),
            })
        }
    };
});

describe('NostrService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset identity
        nostrService.setIdentity(null);
    });

    it('should add alias tags when saving a note', async () => {
        // Setup
        const mockNote: Note = {
            id: 'note1',
            content: 'test content',
            properties: [{ key: 'coder', values: ['true'], operator: 'is' }],
            tags: [],
            privacy: 'public',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            author: 'pubkey1',
            source: { type: 'user', identifier: 'user', timestamp: Date.now() },
            priority: 1
        };

        const mockOntology = [{ id: 'root' }]; // Dummy ontology

        // Mock getAliases to return aliases
        // canonical: software_engineer, alias: coder, programmer
        (getAliases as any).mockReturnValue(['software_engineer', 'coder', 'programmer']);
        (getCanonicalKey as any).mockReturnValue('software_engineer');

        // Set identity to allow publishing
        const mockPrivKey = 'a'.repeat(64); // Valid hex
        nostrService.setIdentity(mockPrivKey);

        // Act
        await nostrService.saveNote(mockNote, mockOntology);

        // Assert
        expect(publishNoteToNostr).toHaveBeenCalledTimes(1);
        const calledNote = (publishNoteToNostr as any).mock.calls[0][0];

        // Check tags
        // Expect 'prop:software_engineer' and 'prop:programmer'
        // 'prop:coder' is the original key, so it might not be added by NostrService (depending on logic)
        // But publishNoteToNostr adds it anyway.
        // We are testing that NostrService adds the OTHER aliases.

        const tags = calledNote.tags;
        expect(tags).toContain('prop:software_engineer');
        expect(tags).toContain('prop:programmer');
        // It should NOT contain 'prop:coder' if we filter it out (as per plan),
        // or it might contain it if we don't. Ideally we filter it out to avoid duplicates with publishNoteToNostr.
        // But let's see what the implementation does.
        // The implementation I planned: add all aliases EXCEPT prop.key.
        expect(tags).not.toContain('prop:coder');
    });
});
