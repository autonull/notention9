/**
 * Commitment Lifecycle — State machine for note commitments
 * Manages transitions: open → matched → committed → done/lapsed/cancelled
 */

import type { Note, NoteStatus, Property } from '../types/index.js';
import { createNote } from '../notes/notes.js';

export type CommitmentTransition =
    | { from: 'open'; to: 'matched'; trigger: 'match_found' }
    | { from: 'open'; to: 'cancelled'; trigger: 'user_cancelled' }
    | { from: 'matched'; to: 'committed'; trigger: 'user_committed' }
    | { from: 'matched'; to: 'open'; trigger: 'match_lost' }
    | { from: 'matched'; to: 'cancelled'; trigger: 'user_cancelled' }
    | { from: 'committed'; to: 'done'; trigger: 'completed' }
    | { from: 'committed'; to: 'lapsed'; trigger: 'deadline_passed' }
    | { from: 'committed'; to: 'cancelled'; trigger: 'user_cancelled' }
    | { from: 'lapsed'; to: 'open'; trigger: 'reopened' }
    | { from: 'done'; to: 'open'; trigger: 'reopened' };

export interface CommitmentState {
    status: NoteStatus;
    committedAt?: string;
    expectedCompletion?: string;
    completedAt?: string;
    lapsedAt?: string;
    cancelledAt?: string;
    deadline?: string;
    relatedNoteIds?: string[];
}

export interface CommitmentEvent {
    id: string;
    noteId: string;
    fromStatus: NoteStatus;
    toStatus: NoteStatus;
    trigger: CommitmentTransition['trigger'];
    timestamp: string;
    metadata?: Record<string, unknown>;
}

export interface CommitmentLifecycleConfig {
    /** Auto-lapse after deadline (ms) - 0 to disable */
    autoLapseInterval: number;
    /** Require deadline for commitment */
    requireDeadline: boolean;
    /** Allow reopening done/lapsed commitments */
    allowReopen: boolean;
}

/**
 * Commitment Lifecycle Manager
 * Enforces valid state transitions and emits events
 */
export class CommitmentLifecycle {
    private config: CommitmentLifecycleConfig;
    private eventLog: CommitmentEvent[] = [];

    constructor(config: Partial<CommitmentLifecycleConfig> = {}) {
        this.config = {
            autoLapseInterval: 60000, // Check every minute
            requireDeadline: true,
            allowReopen: true,
            ...config,
        };
    }

    /**
     * Get valid transitions from a status
     */
    getValidTransitions(status: NoteStatus): CommitmentTransition[] {
        const transitions: CommitmentTransition[] = [
            { from: 'open', to: 'matched', trigger: 'match_found' },
            { from: 'open', to: 'cancelled', trigger: 'user_cancelled' },
            { from: 'matched', to: 'committed', trigger: 'user_committed' },
            { from: 'matched', to: 'open', trigger: 'match_lost' },
            { from: 'matched', to: 'cancelled', trigger: 'user_cancelled' },
            { from: 'committed', to: 'done', trigger: 'completed' },
            { from: 'committed', to: 'lapsed', trigger: 'deadline_passed' },
            { from: 'committed', to: 'cancelled', trigger: 'user_cancelled' },
            { from: 'lapsed', to: 'open', trigger: 'reopened' },
            { from: 'done', to: 'open', trigger: 'reopened' },
        ];

        return transitions.filter(t => t.from === status);
    }

    /**
     * Check if a transition is valid
     */
    isValidTransition(from: NoteStatus, to: NoteStatus, trigger: CommitmentTransition['trigger']): boolean {
        return this.getValidTransitions(from).some(t => t.to === to && t.trigger === trigger);
    }

    /**
     * Get the commitment state from a note
     */
    getState(note: Note): CommitmentState {
        return {
            status: note.status ?? 'open',
            committedAt: note.commitment?.committedAt,
            expectedCompletion: note.commitment?.expectedCompletion,
            deadline: note.deadline,
            relatedNoteIds: note.commitment?.relatedNoteIds,
        };
    }

    /**
     * Apply a transition to a note
     * Returns the updated note or throws if invalid
     */
    transition(note: Note, toStatus: NoteStatus, trigger: CommitmentTransition['trigger'], metadata?: Record<string, unknown>): Note {
        const fromStatus = note.status ?? 'open';

        if (!this.isValidTransition(fromStatus, toStatus, trigger)) {
            throw new Error(`Invalid commitment transition: ${fromStatus} -> ${toStatus} via ${trigger}`);
        }

        // Validate preconditions
        this.validateTransition(note, fromStatus, toStatus, trigger);

        const now = new Date().toISOString();
        const updatedNote = { ...note, status: toStatus, updatedAt: now };
        // Ensure commitment object exists
        const commitment = { ...updatedNote.commitment, committedAt: updatedNote.commitment?.committedAt, expectedCompletion: updatedNote.commitment?.expectedCompletion, completedAt: updatedNote.commitment?.completedAt, lapsedAt: updatedNote.commitment?.lapsedAt, cancelledAt: updatedNote.commitment?.cancelledAt, relatedNoteIds: updatedNote.commitment?.relatedNoteIds };

        switch (toStatus) {
            case 'matched':
                // Match found - no additional fields needed
                break;
            case 'committed':
                if (this.config.requireDeadline && !note.deadline) {
                    throw new Error('Cannot commit without deadline');
                }
                commitment.committedAt = now;
                commitment.expectedCompletion = note.deadline;
                break;
            case 'done':
                commitment.completedAt = now;
                break;
            case 'lapsed':
                commitment.lapsedAt = now;
                break;
            case 'cancelled':
                commitment.cancelledAt = now;
                break;
            case 'open':
                // Reopening - clear commitment metadata
                commitment.committedAt = undefined;
                commitment.expectedCompletion = undefined;
                commitment.completedAt = undefined;
                commitment.lapsedAt = undefined;
                commitment.cancelledAt = undefined;
                break;
        }

        updatedNote.commitment = commitment as NonNullable<Note['commitment']>;

        // Log event
        this.logEvent({
            noteId: note.id,
            fromStatus,
            toStatus,
            trigger,
            timestamp: now,
            metadata,
        });

        return updatedNote;
    }

    /**
     * Validate transition preconditions
     */
    private validateTransition(note: Note, from: NoteStatus, to: NoteStatus, trigger: CommitmentTransition['trigger']): void {
        if (to === 'committed' && this.config.requireDeadline && !note.deadline) {
            throw new Error('Deadline required for commitment');
        }

        if (to === 'done' && from !== 'committed') {
            throw new Error('Can only complete committed items');
        }

        if (to === 'lapsed' && from !== 'committed') {
            throw new Error('Can only lapse committed items');
        }

        if ((to === 'lapsed' || to === 'done') && !this.config.allowReopen && (from === 'lapsed' || from === 'done')) {
            throw new Error('Cannot reopen lapsed/done items');
        }
    }

    /**
     * Check and auto-lapse overdue commitments
     */
    checkLapsed(notes: Note[]): Note[] {
        const now = new Date();
        const updated: Note[] = [];

        for (const note of notes) {
            if (note.status === 'committed' && note.deadline) {
                const deadline = new Date(note.deadline);
                if (deadline < now) {
                    try {
                        const lapsedNote = this.transition(note, 'lapsed', 'deadline_passed', { autoLapsed: true });
                        updated.push(lapsedNote);
                    } catch {
                        // Transition not valid, skip
                    }
                }
            }
        }

        return updated;
    }

    /**
     * Commit a matched note
     */
    commit(note: Note, deadline?: string): Note {
        if (note.status !== 'matched') {
            throw new Error(`Can only commit matched notes, current status: ${note.status}`);
        }
        if (deadline) {
            note = { ...note, deadline };
        }
        return this.transition(note, 'committed', 'user_committed');
    }

    /**
     * Mark a committed note as done
     */
    complete(note: Note): Note {
        if (note.status !== 'committed') {
            throw new Error(`Can only complete committed notes, current status: ${note.status}`);
        }
        return this.transition(note, 'done', 'completed');
    }

    /**
     * Cancel a commitment at any stage
     */
    cancel(note: Note, reason?: string): Note {
        return this.transition(note, 'cancelled', 'user_cancelled', { reason });
    }

    /**
     * Reopen a done/lapsed note
     */
    reopen(note: Note): Note {
        if (note.status !== 'done' && note.status !== 'lapsed') {
            throw new Error(`Can only reopen done or lapsed notes, current status: ${note.status}`);
        }
        if (!this.config.allowReopen) {
            throw new Error('Reopening is disabled');
        }
        return this.transition(note, 'open', 'reopened');
    }

    /**
     * Handle match found for an open note
     */
    matchFound(note: Note, matchNoteId: string): Note {
        if (note.status !== 'open') {
            throw new Error(`Can only match open notes, current status: ${note.status}`);
        }
        const updated = this.transition(note, 'matched', 'match_found');
        return {
            ...updated,
            commitment: {
                ...updated.commitment!,
                relatedNoteIds: [...(updated.commitment?.relatedNoteIds ?? []), matchNoteId],
            },
        };
    }

    /**
     * Handle match lost
     */
    matchLost(note: Note): Note {
        if (note.status !== 'matched') {
            throw new Error(`Can only lose match on matched notes, current status: ${note.status}`);
        }
        return this.transition(note, 'open', 'match_lost');
    }

    /**
     * Get event log
     */
    getEvents(noteId?: string): CommitmentEvent[] {
        if (noteId) {
            return this.eventLog.filter(e => e.noteId === noteId);
        }
        return [...this.eventLog];
    }

    /**
     * Log an event
     */
    private logEvent(event: Omit<CommitmentEvent, 'id'>): void {
        this.eventLog.push({
            ...event,
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        });
    }

    /**
     * Get commitment metrics for a set of notes
     */
    getMetrics(notes: Note[]): {
        byStatus: Record<NoteStatus, number>;
        committedCount: number;
        completedCount: number;
        lapsedCount: number;
        cancelledCount: number;
        avgTimeToCommit?: number;
        avgTimeToComplete?: number;
    } {
        const byStatus: Record<NoteStatus, number> = {
            open: 0,
            matched: 0,
            committed: 0,
            done: 0,
            lapsed: 0,
            cancelled: 0,
        };

        let commitTimes: number[] = [];
        let completeTimes: number[] = [];

        for (const note of notes) {
            const status = note.status ?? 'open';
            byStatus[status]++;

            if (note.commitment?.committedAt && note.createdAt) {
                commitTimes.push(new Date(note.commitment.committedAt).getTime() - new Date(note.createdAt).getTime());
            }
            if (note.commitment?.completedAt && note.commitment?.committedAt) {
                completeTimes.push(new Date(note.commitment.completedAt).getTime() - new Date(note.commitment.committedAt).getTime());
            }
        }

        return {
            byStatus,
            committedCount: byStatus.committed,
            completedCount: byStatus.done,
            lapsedCount: byStatus.lapsed,
            cancelledCount: byStatus.cancelled,
            avgTimeToCommit: commitTimes.length ? commitTimes.reduce((a, b) => a + b, 0) / commitTimes.length : undefined,
            avgTimeToComplete: completeTimes.length ? completeTimes.reduce((a, b) => a + b, 0) / completeTimes.length : undefined,
        };
    }
}

/**
 * Create a commitment-enabled note
 */
export function createCommitmentNote(
    content: string,
    properties: Property[],
    deadline: string,
    tags: string[] = []
): Note {
    const note = createNote({ content, properties, tags });
    note.status = 'open';
    note.deadline = deadline;
    note.commitment = {
        committedAt: undefined,
        expectedCompletion: deadline,
        relatedNoteIds: [],
    };
    return note;
}

/**
 * Singleton instance
 */
let commitmentLifecycleInstance: CommitmentLifecycle | null = null;

export function getCommitmentLifecycle(config?: Partial<CommitmentLifecycleConfig>): CommitmentLifecycle {
    if (!commitmentLifecycleInstance) {
        commitmentLifecycleInstance = new CommitmentLifecycle(config);
    }
    return commitmentLifecycleInstance;
}

export function resetCommitmentLifecycle(): void {
    commitmentLifecycleInstance = null;
}