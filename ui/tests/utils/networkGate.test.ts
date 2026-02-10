import {describe, expect, it, vi} from 'vitest';
import {createNote, NetworkGate, PrivacyError} from '@notention/core';

describe('NetworkGate', () => {
    const networkGate = new NetworkGate();

    describe('canTransmit', () => {
        it('allows transmission of public notes without prompt', async () => {
            const note = createNote({
                title: 'Public Note',
                privacy: 'public'
            });

            const canTransmit = await networkGate.canTransmit(note, 'test destination');
            expect(canTransmit).toBe(true);
        });

        it('throws PrivacyError for private notes without promptUser callback', async () => {
            const note = createNote({
                title: 'Private Note',
                privacy: 'private'
            });

            await expect(
                networkGate.canTransmit(note, 'test destination')
            ).rejects.toThrow(PrivacyError);
        });

        it('returns false when user declines to make note public', async () => {
            const note = createNote({
                title: 'Private Note',
                privacy: 'private'
            });

            const promptUser = vi.fn().mockResolvedValue(false);
            const canTransmit = await networkGate.canTransmit(note, 'test destination', promptUser);

            expect(canTransmit).toBe(false);
            expect(promptUser).toHaveBeenCalledWith(
                expect.stringContaining('Private Note')
            );
            expect(note.privacy).toBe('private'); // Should not mutate if user declined
        });

        it('returns true and makes note public when user confirms', async () => {
            const note = createNote({
                title: 'Private Note',
                privacy: 'private'
            });

            const promptUser = vi.fn().mockResolvedValue(true);
            const canTransmit = await networkGate.canTransmit(note, 'Nostr network', promptUser);

            expect(canTransmit).toBe(true);
            expect(promptUser).toHaveBeenCalledWith(
                expect.stringContaining('Private Note')
            );
            expect(promptUser).toHaveBeenCalledWith(
                expect.stringContaining('Nostr network')
            );
            expect(note.privacy).toBe('public'); // Should mutate to public
        });
    });

    describe('filterTransmittable', () => {
        it('filters out private notes without prompt', async () => {
            const notes = [
                createNote({title: 'Public 1', privacy: 'public'}),
                createNote({title: 'Private 1', privacy: 'private'}),
                createNote({title: 'Public 2', privacy: 'public'}),
                createNote({title: 'Private 2', privacy: 'private'}),
            ];

            const transmittable = await networkGate.filterTransmittable(notes, 'test');

            expect(transmittable).toHaveLength(2);
            expect(transmittable[0].title).toBe('Public 1');
            expect(transmittable[1].title).toBe('Public 2');
        });

        it('prompts user for each private note', async () => {
            const notes = [
                createNote({title: 'Public 1', privacy: 'public'}),
                createNote({title: 'Private 1', privacy: 'private'}),
                createNote({title: 'Private 2', privacy: 'private'}),
            ];

            const promptUser = vi.fn()
                .mockResolvedValueOnce(true)  // First private note - user confirms
                .mockResolvedValueOnce(false); // Second private note - user declines

            const transmittable = await networkGate.filterTransmittable(notes, 'test', promptUser);

            expect(transmittable).toHaveLength(2); // Public 1 + Private 1 (confirmed)
            expect(promptUser).toHaveBeenCalledTimes(2);
            expect(notes[1].privacy).toBe('public'); // Private 1 should be made public
            expect(notes[2].privacy).toBe('private'); // Private 2 should stay private
        });
    });
});
