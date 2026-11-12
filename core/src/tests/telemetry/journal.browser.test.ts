import { describe, it, expect } from 'vitest';
import { Journal } from '../../telemetry/journal.browser.js';
import { MemoryStorageAdapter } from '../../storage/Storage.browser.js';

const needEvent = (noteId: string) => ({
    workflow: 'capture',
    seam: 'capture',
    kind: 'need_expressed' as const,
    count: 1,
    noteId,
});

describe('Browser friction journal', () => {
    it('stores every event exactly once', async () => {
        const journal = new Journal(new MemoryStorageAdapter());

        journal.record(needEvent('note-a'));
        journal.record(needEvent('note-a'));
        journal.record(needEvent('note-b'));

        await journal.flush();

        const events = await journal.getEvents();
        expect(events).toHaveLength(3);
        expect(events.map(e => e.noteId)).toEqual(['note-a', 'note-a', 'note-b']);
    });

    it('keeps events recorded while a flush is in flight', async () => {
        const journal = new Journal(new MemoryStorageAdapter());

        journal.record(needEvent('note-a'));
        const flushing = journal.flush();
        journal.record(needEvent('note-b'));
        await flushing;
        await journal.flush();

        const events = await journal.getEvents();
        expect(events.map(e => e.noteId)).toEqual(['note-a', 'note-b']);
    });

    it('stores every event once when flushes overlap', async () => {
        const journal = new Journal(new MemoryStorageAdapter());

        for (let index = 0; index < 10; index++) {
            journal.record(needEvent(`note-${index}`));
        }
        await Promise.all([journal.flush(), journal.flush(), journal.flush()]);

        const events = await journal.getEvents();
        expect(events).toHaveLength(10);
        expect(new Set(events.map(e => e.noteId)).size).toBe(10);
    });
});
