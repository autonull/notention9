import {useMemo} from 'react';
import type {Note} from '@notention/core';

export interface TimelineEvent {
    note: Note;
    date: Date;
    label: string;
}

export function useTimelineEvents(notes: Note[]) {
    return useMemo(() => {
        const upcoming: TimelineEvent[] = [];
        const past: TimelineEvent[] = [];
        const now = new Date();

        notes.forEach(note => {
            note.properties.forEach(p => {
                const key = p.key.toLowerCase();
                const val = p.values[0];
                if (!val) return;

                if (['date', 'time', 'deadline', 'start', 'end', 'due'].some(k => key.includes(k))) {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                        const evt = {
                            note,
                            date: d,
                            label: p.key
                        };
                        if (d > now) {
                            upcoming.push(evt);
                        } else {
                            past.push(evt);
                        }
                    }
                }
            });
        });

        // Sort upcoming by date ascending (nearest first)
        upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Sort past by date descending (most recent first)
        past.sort((a, b) => b.date.getTime() - a.date.getTime());

        return {
            upcomingEvents: upcoming,
            pastEvents: past
        };
    }, [notes]);
};
