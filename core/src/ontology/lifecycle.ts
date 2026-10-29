import type { Note, NoteStatus } from '../types/domain.js';

/**
 * Valid status transitions for note lifecycle
 * open → matched → committed → done → lapsed
 */
const STATUS_TRANSITIONS: Record<NoteStatus, NoteStatus[]> = {
    open: ['matched', 'committed', 'lapsed'],
    matched: ['committed', 'open', 'lapsed'],
    committed: ['done', 'matched', 'open', 'lapsed'],
    done: ['open', 'lapsed'],
    lapsed: ['open'],
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: NoteStatus, to: NoteStatus): boolean {
    return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get valid next statuses from current status
 */
export function getValidNextStatuses(current: NoteStatus): NoteStatus[] {
    return STATUS_TRANSITIONS[current] ?? [];
}

/**
 * Transition a note's status with validation
 */
export function transitionNoteStatus(
    note: Note,
    newStatus: NoteStatus,
    options: { commitment?: Note['commitment']; deadline?: string } = {}
): Note {
    const currentStatus = note.status ?? 'open';
    
    if (!isValidTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid status transition: ${currentStatus} → ${newStatus}. Valid: ${getValidNextStatuses(currentStatus).join(', ')}`);
    }

    const updated: Note = {
        ...note,
        status: newStatus,
        updatedAt: new Date().toISOString(),
    };

    // Handle commitment metadata
    if (newStatus === 'committed' && options.commitment) {
        updated.commitment = {
            committedAt: new Date().toISOString(),
            expectedCompletion: options.deadline,
            relatedNoteIds: options.commitment.relatedNoteIds,
        };
        if (options.deadline) {
            updated.deadline = options.deadline;
        }
    }

    // Clear deadline when done or lapsed
    if (newStatus === 'done' || newStatus === 'lapsed') {
        delete updated.deadline;
    }

    return updated;
}

/**
 * Check if a note is overdue
 */
export function isNoteOverdue(note: Note): boolean {
    if (!note.deadline || note.status === 'done' || note.status === 'lapsed') {
        return false;
    }
    return new Date(note.deadline) < new Date();
}

/**
 * Get notes that need attention (overdue or stuck)
 */
export function getNotesNeedingAttention(notes: Note[]): Note[] {
    const now = new Date();
    return notes.filter(note => {
        if (!note.deadline) return false;
        if (note.status === 'done' || note.status === 'lapsed') return false;
        return new Date(note.deadline) < now;
    });
}

/**
 * Auto-transition notes based on rules
 * - matched + deadline passed → committed (if not already)
 * - committed + deadline passed → done (if criteria met)
 * - any + deadline far past → lapsed
 */
export function autoTransitionNotes(notes: Note[]): Note[] {
    return notes.map(note => {
        const currentStatus = note.status ?? 'open';
        
        // Auto-lapse very old items
        if (note.createdAt && new Date(note.createdAt) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) {
            if (currentStatus !== 'done' && currentStatus !== 'lapsed') {
                return transitionNoteStatus(note, 'lapsed');
            }
        }
        
        // Auto-commit matched items with deadlines
        if (currentStatus === 'matched' && note.deadline) {
            return transitionNoteStatus(note, 'committed');
        }
        
        return note;
    });
}

/**
 * Status display labels
 */
export const STATUS_LABELS: Record<NoteStatus, string> = {
    open: 'Open',
    matched: 'Matched',
    committed: 'Committed',
    done: 'Done',
    lapsed: 'Lapsed',
};

/**
 * Status colors for UI
 */
export const STATUS_COLORS: Record<NoteStatus, string> = {
    open: 'blue',
    matched: 'purple',
    committed: 'orange',
    done: 'green',
    lapsed: 'gray',
};

/**
 * Status descriptions
 */
export const STATUS_DESCRIPTIONS: Record<NoteStatus, string> = {
    open: 'Newly created, awaiting matching or action',
    matched: 'Found relevant matches, ready for commitment',
    committed: 'Active commitment with deadline',
    done: 'Successfully completed',
    lapsed: 'Expired or abandoned',
};