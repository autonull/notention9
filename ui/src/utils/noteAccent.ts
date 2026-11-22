import type {Note} from '@notention/core';

export const noteAccentClass = (note: Note): string => {
    const intent = note.properties.find(p => p.key === 'intent')?.values[0];
    const type = note.properties.find(p => p.key === 'type')?.values[0];
    if (intent === 'request') return 'note-request';
    if (intent === 'offer') return 'note-offer';
    if (note.tags.includes('task') || type === 'task') return 'note-task';
    if (type === 'event') return 'note-event';
    if (type === 'person') return 'note-person';
    return 'note-neutral';
};
