import { describe, it, expect, vi } from 'vitest';
import { NetworkGate, PrivacyError, createNote } from '@notention/core';

describe('NetworkGate', () => {
    const networkGate = new NetworkGate();

    describe('canTransmit', () => {
        it('allows transmission of public notes without prompt', async () => {
            const note = createNote({
                title: 'Public Note',
                public: true
            });

            const canTransmit = await networkGate.canTransmit(note, 'test destination');
            expect(canTransmit).toBe(true);
        });

        it('throws PrivacyError for private notes without promptUser callback', async () => {
            const note = createNote({
                title: 'Private Note',
                public: false
            });

            await expect(
                networkGate.canTransmit(note, 'test destination')
            ).rejects.toThrow(PrivacyError);
        });

        it('returns false when user declines to make note public', async () => {
            const note = createNote({
                title: 'Private Note',
                public: false
            });

            const promptUser = vi.fn().mockResolvedValue(false);
            const canTransmit = await networkGate.canTransmit(note, 'test destination', promptUser);

            expect(canTransmit).toBe(false);
            expect(promptUser).toHaveBeenCalledWith(
                expect.stringContaining('Private Note')
            );
            expect(note.public).toBe(false); // Should not mutate if user declined
        });

        it('returns true and makes note public when user confirms', async () => {
            const note = createNote({
                title: 'Private Note',
                public: false
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
            expect(note.public).toBe(true); // Should mutate to public
        });
    });

    describe('filterTransmittable', () => {
        it('filters out private notes without prompt', async () => {
            const notes = [
                createNote({ title: 'Public 1', public: true }),
                createNote({ title: 'Private 1', public: false }),
                createNote({ title: 'Public 2', public: true }),
                createNote({ title: 'Private 2', public: false }),
            ];

            const transmittable = await networkGate.filterTransmittable(notes, 'test');

            expect(transmittable).toHaveLength(2);
            expect(transmittable[0].title).toBe('Public 1');
            expect(transmittable[1].title).toBe('Public 2');
        });

        it('prompts user for each private note', async () => {
            const notes = [
                createNote({ title: 'Public 1', public: true }),
                createNote({ title: 'Private 1', public: false }),
                createNote({ title: 'Private 2', public: false }),
            ];

            const promptUser = vi.fn()
                .mockResolvedValueOnce(true)  // First private note - user confirms
                .mockResolvedValueOnce(false); // Second private note - user declines

            const transmittable = await networkGate.filterTransmittable(notes, 'test', promptUser);

            expect(transmittable).toHaveLength(2); // Public 1 + Private 1 (confirmed)
            expect(promptUser).toHaveBeenCalledTimes(2);
            expect(notes[1].public).toBe(true); // Private 1 should be made public
            expect(notes[2].public).toBe(false); // Private 2 should stay private
        });
    });
});
