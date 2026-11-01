/**
 * Commitment Lifecycle tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommitmentLifecycle, createCommitmentNote, getCommitmentLifecycle, resetCommitmentLifecycle } from './commitmentLifecycle.js';
import type { Note, Property } from '../types/index.js';

describe('CommitmentLifecycle', () => {
    let lifecycle: CommitmentLifecycle;

    beforeEach(() => {
        resetCommitmentLifecycle();
        lifecycle = new CommitmentLifecycle({ requireDeadline: true, allowReopen: true });
    });

    const baseNote: Note = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Need a ramp installed',
        tags: ['care'],
        properties: [
            { key: 'need', operator: 'contains', values: ['wheelchair ramp'] },
            { key: 'deadline', operator: 'is', values: ['2026-12-31'] },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: { type: 'user', identifier: 'test', timestamp: Date.now() },
        privacy: 'private',
        priority: 0,
        status: 'open',
        deadline: '2026-12-31',
        commitment: { committedAt: '', expectedCompletion: '2026-12-31', relatedNoteIds: [] },
    };

    it('allows valid open -> matched transition', () => {
        const matchedNote = lifecycle.transition(baseNote, 'matched', 'match_found');
        expect(matchedNote.status).toBe('matched');
    });

    it('allows matched -> committed transition', () => {
        const matchedNote = lifecycle.transition(baseNote, 'matched', 'match_found');
        const committedNote = lifecycle.transition(matchedNote, 'committed', 'user_committed');
        expect(committedNote.status).toBe('committed');
        expect(committedNote.commitment?.committedAt).toBeDefined();
    });

    it('allows committed -> done transition', () => {
        const matchedNote = lifecycle.transition(baseNote, 'matched', 'match_found');
        const committedNote = lifecycle.transition(matchedNote, 'committed', 'user_committed');
        const doneNote = lifecycle.transition(committedNote, 'done', 'completed');
        expect(doneNote.status).toBe('done');
        expect(doneNote.commitment?.completedAt).toBeDefined();
    });

    it('allows committed -> lapsed transition', () => {
        const matchedNote = lifecycle.transition(baseNote, 'matched', 'match_found');
        const committedNote = lifecycle.transition(matchedNote, 'committed', 'user_committed');
        const lapsedNote = lifecycle.transition(committedNote, 'lapsed', 'deadline_passed');
        expect(lapsedNote.status).toBe('lapsed');
        expect(lapsedNote.commitment?.lapsedAt).toBeDefined();
    });

    it('allows cancelled at any stage', () => {
        const cancelledOpen = lifecycle.transition(baseNote, 'cancelled', 'user_cancelled');
        expect(cancelledOpen.status).toBe('cancelled');

        const matchedNote = lifecycle.transition(baseNote, 'matched', 'match_found');
        const cancelledMatched = lifecycle.transition(matchedNote, 'cancelled', 'user_cancelled');
        expect(cancelledMatched.status).toBe('cancelled');

        const committedNote = lifecycle.transition(matchedNote, 'committed', 'user_committed');
        const cancelledCommitted = lifecycle.transition(committedNote, 'cancelled', 'user_cancelled');
        expect(cancelledCommitted.status).toBe('cancelled');
    });

    it('allows reopening done -> open', () => {
        const matchedNote = lifecycle.transition(baseNote, 'matched', 'match_found');
        const committedNote = lifecycle.transition(matchedNote, 'committed', 'user_committed');
        const doneNote = lifecycle.transition(committedNote, 'done', 'completed');
        const reopenedNote = lifecycle.transition(doneNote, 'open', 'reopened');
        expect(reopenedNote.status).toBe('open');
    });

    it('allows reopening lapsed -> open', () => {
        const matchedNote = lifecycle.transition(baseNote, 'matched', 'match_found');
        const committedNote = lifecycle.transition(matchedNote, 'committed', 'user_committed');
        const lapsedNote = lifecycle.transition(committedNote, 'lapsed', 'deadline_passed');
        const reopenedNote = lifecycle.transition(lapsedNote, 'open', 'reopened');
        expect(reopenedNote.status).toBe('open');
    });

    it('rejects invalid transitions', () => {
        expect(() => lifecycle.transition(baseNote, 'committed', 'user_committed'))
            .toThrow('Invalid commitment transition');

        expect(() => lifecycle.transition(baseNote, 'done', 'completed'))
            .toThrow('Invalid commitment transition');
    });

    it('rejects commit without deadline when required', () => {
        const noDeadlineNote = { ...baseNote, deadline: undefined };
        const matchedNote = lifecycle.transition(noDeadlineNote, 'matched', 'match_found');
        
        expect(() => lifecycle.transition(matchedNote, 'committed', 'user_committed'))
            .toThrow('Deadline required for commitment');
    });

    it('matchFound adds related note', () => {
        const matchedNote = lifecycle.matchFound(baseNote, 'match-note-1');
        expect(matchedNote.status).toBe('matched');
        expect(matchedNote.commitment?.relatedNoteIds).toContain('match-note-1');
    });

    it('matchLost returns to open', () => {
        const matchedNote = lifecycle.matchFound(baseNote, 'match-note-1');
        const openNote = lifecycle.matchLost(matchedNote);
        expect(openNote.status).toBe('open');
    });

    it('commit helper works', () => {
        const matchedNote = lifecycle.matchFound(baseNote, 'match-1');
        const committedNote = lifecycle.commit(matchedNote);
        expect(committedNote.status).toBe('committed');
    });

    it('complete helper works', () => {
        const matchedNote = lifecycle.matchFound(baseNote, 'match-1');
        const committedNote = lifecycle.commit(matchedNote);
        const doneNote = lifecycle.complete(committedNote);
        expect(doneNote.status).toBe('done');
    });

    it('cancel helper works', () => {
        const cancelledNote = lifecycle.cancel(baseNote, 'Changed mind');
        expect(cancelledNote.status).toBe('cancelled');
        expect(cancelledNote.commitment?.cancelledAt).toBeDefined();
    });

    it('reopen helper works', () => {
        const matchedNote = lifecycle.matchFound(baseNote, 'match-1');
        const committedNote = lifecycle.commit(matchedNote);
        const doneNote = lifecycle.complete(committedNote);
        const reopenedNote = lifecycle.reopen(doneNote);
        expect(reopenedNote.status).toBe('open');
    });

    it('checkLapsed auto-lapses overdue commitments', () => {
        const pastDeadline = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const committedNote = {
            ...baseNote,
            status: 'committed' as const,
            deadline: pastDeadline,
            commitment: { committedAt: new Date().toISOString(), expectedCompletion: pastDeadline, relatedNoteIds: [] },
        };

        const updated = lifecycle.checkLapsed([committedNote]);
        expect(updated.length).toBe(1);
        expect(updated[0].status).toBe('lapsed');
    });

    it('checkLapsed does not lapse future commitments', () => {
        const futureDeadline = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const committedNote = {
            ...baseNote,
            status: 'committed' as const,
            deadline: futureDeadline,
            commitment: { committedAt: new Date().toISOString(), expectedCompletion: futureDeadline, relatedNoteIds: [] },
        };

        const updated = lifecycle.checkLapsed([committedNote]);
        expect(updated.length).toBe(0);
    });

    it('logs events', () => {
        const matchedNote = lifecycle.transition(baseNote, 'matched', 'match_found');
        lifecycle.transition(matchedNote, 'committed', 'user_committed');
        
        const events = lifecycle.getEvents(baseNote.id);
        expect(events.length).toBe(2);
        expect(events[0].fromStatus).toBe('open');
        expect(events[0].toStatus).toBe('matched');
        expect(events[1].fromStatus).toBe('matched');
        expect(events[1].toStatus).toBe('committed');
    });

    it('computes metrics', () => {
        const notes: Note[] = [
            { ...baseNote, id: '1', status: 'open' as const },
            { ...baseNote, id: '2', status: 'matched' as const },
            { ...baseNote, id: '3', status: 'committed' as const, commitment: { committedAt: new Date().toISOString(), expectedCompletion: '2026-12-31', relatedNoteIds: [] } },
            { ...baseNote, id: '4', status: 'done' as const, commitment: { committedAt: new Date().toISOString(), completedAt: new Date().toISOString(), expectedCompletion: '2026-12-31', relatedNoteIds: [] } },
            { ...baseNote, id: '5', status: 'lapsed' as const },
            { ...baseNote, id: '6', status: 'cancelled' as const },
        ];

        const metrics = lifecycle.getMetrics(notes);
        expect(metrics.byStatus.open).toBe(1);
        expect(metrics.byStatus.matched).toBe(1);
        expect(metrics.byStatus.committed).toBe(1);
        expect(metrics.byStatus.done).toBe(1);
        expect(metrics.byStatus.lapsed).toBe(1);
        expect(metrics.byStatus.cancelled).toBe(1);
    });
});

describe('createCommitmentNote', () => {
    it('creates a note with commitment fields', () => {
        const props: Property[] = [
            { key: 'need', operator: 'contains', values: ['test'] },
        ];
        const deadline = '2026-12-31';
        
        const note = createCommitmentNote('Test content', props, deadline, ['tag1']);
        
        expect(note.content).toBe('Test content');
        expect(note.properties).toEqual(props);
        expect(note.tags).toEqual(['tag1']);
        expect(note.status).toBe('open');
        expect(note.deadline).toBe(deadline);
        expect(note.commitment).toBeDefined();
        expect(note.commitment!.expectedCompletion).toBe(deadline);
    });
});