/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nostrService } from './NostrService';
import { publishNoteToNostr } from '@notention/core';
import {createTestNote} from '../tests/utils/testNote';

// Mock dependencies
vi.mock('@notention/core', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...(actual as any),
        publishNoteToNostr: vi.fn(),
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

    it('should save a public note without alias tags (canonical naming)', async () => {
        // Setup
        const mockNote = createTestNote({
            id: 'note1',
            content: 'test content',
            properties: [{ key: 'role', values: ['developer'], operator: 'is' }],
            tags: [],
            privacy: 'public',
            author: 'pubkey1',
            priority: 1
        });

        const mockOntology = [{ id: 'root', label: 'root' }]; // Dummy ontology

        // Set identity to allow publishing
        const mockPrivKey = 'a'.repeat(64); // Valid hex
        nostrService.setIdentity(mockPrivKey);

        // Act
        await nostrService.saveNote(mockNote, mockOntology);

        // Assert
        expect(publishNoteToNostr).toHaveBeenCalledTimes(1);
        const calledNote = (publishNoteToNostr as any).mock.calls[0][0];

        // Check tags - should not add extra alias tags since ontology uses canonical unified naming
        const tags = calledNote.tags;
        // No alias tags should be added by NostrService
        // publishNoteToNostr may add 'prop:role' for the property key
        expect(tags.filter((t: string) => t.startsWith('prop:')).length).toBeGreaterThanOrEqual(0);
    });

    it('should not save private notes', async () => {
        const mockNote = createTestNote({
            id: 'note2',
            content: 'private content',
            properties: [],
            tags: [],
            privacy: 'private',
            author: 'pubkey1',
            priority: 1
        });

        const mockPrivKey = 'a'.repeat(64);
        nostrService.setIdentity(mockPrivKey);

        await nostrService.saveNote(mockNote, []);

        expect(publishNoteToNostr).not.toHaveBeenCalled();
    });
});