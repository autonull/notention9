import React from 'react';
import type {Note} from '@notention/core';

export const isTaskNote = (note: Note): boolean =>
    note.tags.includes('task') || note.properties.some(p => p.key === 'status' && p.values.includes('todo'));

export interface NoteCounts {
    all: number;
    tasks: number;
    tags: number;
    trash: number;
}

export function getNoteCounts(notes: Note[]): NoteCounts {
    return notes.reduce<NoteCounts>((counts, note) => {
        if (note.deletedAt) {
            counts.trash += 1;
            return counts;
        }
        counts.all += 1;
        if (isTaskNote(note)) counts.tasks += 1;
        if (note.tags.length > 0) counts.tags += 1;
        return counts;
    }, {all: 0, tasks: 0, tags: 0, trash: 0});
}
