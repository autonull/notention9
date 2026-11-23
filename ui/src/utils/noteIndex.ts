import {
    NoteFilter,
    type GeoCoords,
    type Note,
    type NotesGroup,
    type NoteMode,
    type NotesSection,
    type SortOrder,
} from '@notention/core';
import {getNoteCounts, isTaskNote, type NoteCounts} from './noteFilters';

const STATUS_ORDER = [
    'todo', 'queued', 'planned', 'open', 'running', 'in-progress', 'blocked',
    'review', 'completed', 'done', 'cancelled',
];
const UNGROUPED = 'unscheduled';

export interface NoteIndexSelection {
    subset: NotesSection;
    arrangement: NoteMode;
    order: SortOrder;
    query?: string;
    group?: NotesGroup;
    location?: GeoCoords | null;
}

export interface NoteIndexGroup {
    id: string;
    label: string;
    notes: Note[];
}

export interface NoteIndexResult {
    items: Note[];
    counts: NoteCounts;
    groups: NoteIndexGroup[];
    hidden: number;
}

const matchesSubset = (note: Note, subset: NotesSection): boolean => {
    if (subset === 'trash') return !!note.deletedAt;
    if (note.deletedAt) return false;
    if (subset === 'tasks') return isTaskNote(note);
    if (subset === 'tags') return note.tags.length > 0;
    return true;
};

export const groupByStatus = (notes: Note[]): NoteIndexGroup[] => {
    const groups = new Map<string, Note[]>();
    for (const note of notes) {
        const value = note.properties.find(p => p.key === 'status')?.values[0]?.toLowerCase() ?? UNGROUPED;
        const bucket = groups.get(value) ?? [];
        bucket.push(note);
        groups.set(value, bucket);
    }

    const rank = (key: string) => {
        const index = STATUS_ORDER.indexOf(key);
        if (index !== -1) return index;
        return key === UNGROUPED ? 1000 : 500;
    };

    return [...groups.entries()]
        .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
        .map(([id, groupNotes]) => ({
            id,
            label: id === UNGROUPED ? 'No status' : id,
            notes: groupNotes,
        }));
};

/**
 * Pure index composition: subset, arrangement, order, and query in one place.
 * Returns the visible rows and every grouping the arrangement can render.
 */
export function selectIndex(
    notes: Note[],
    selection: NoteIndexSelection,
    filter: NoteFilter = new NoteFilter([]),
): NoteIndexResult {
    const counts = getNoteCounts(notes);
    const showTrash = selection.subset === 'trash';
    const scoped = filter
        .filterAndSort(notes, selection.query ?? '', selection.order, showTrash, selection.location)
        .filter(note => matchesSubset(note, selection.subset));

    const groups = selection.arrangement === 'board'
        ? selection.group === 'none'
            ? [{id: 'all', label: 'All notes', notes: scoped}]
            : groupByStatus(scoped)
        : [];

    return {
        items: scoped,
        counts,
        groups,
        hidden: notes.length - scoped.length,
    };
}
