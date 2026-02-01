import React, { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useNotes } from '../../hooks/useNotes';
import { useView } from '../../hooks/useViewContext';
import { MapPinIcon } from '../common/icons';
import { parseGeoFromValues, haversineDistance } from '@notention/core';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: unknown;
    location?: string | null;
}

export function TimeView() {
    const { notes } = useNotes();
    const { setSelectedNoteId, setActiveView } = useView();
    const [locationFilterId, setLocationFilterId] = useState<string>('');
    const [filterRadius, setFilterRadius] = useState<number>(50); // km

    // Get all notes that have a location property
    const locationNotes = useMemo(() => {
        return notes.filter(n => n.properties.some(p => ['location', 'geo', 'place'].includes(p.key) && p.values[0]));
    }, [notes]);

    const events = useMemo(() => {
        const evts: CalendarEvent[] = [];

        // If filtering by location, get the reference location
        let filterCoords: {lat: number, lng: number} | null = null;
        if (locationFilterId) {
            const filterNote = notes.find(n => n.id === locationFilterId);
            const locProp = filterNote?.properties.find(p => ['location', 'geo', 'place'].includes(p.key));
            if (locProp) {
                filterCoords = parseGeoFromValues(locProp.values);
            }
        }

        notes.forEach(note => {
            const props = note.properties;
            if (!props || props.length === 0) return;

            // Location Check
            if (filterCoords) {
                const noteLocProp = props.find(p => ['location', 'geo', 'place'].includes(p.key));
                if (!noteLocProp) return; // Exclude notes without location if filtering

                const noteCoords = parseGeoFromValues(noteLocProp.values);
                if (!noteCoords) return;

                const dist = haversineDistance(filterCoords, noteCoords);
                if (dist > filterRadius) return;
            }

            // Helper to get date value from keys
            const getDate = (keys: string[]) => {
                for (const key of keys) {
                    const prop = props.find(p => p.key.toLowerCase() === key.toLowerCase());
                    if (prop && prop.values[0]) {
                        const val = prop.values[0];
                        // Try parsing simple dates
                        const d = new Date(val);
                        if (!isNaN(d.getTime())) return d;
                    }
                }
                return null;
            };

            const start = getDate(['startDateTime', 'startDate', 'start', 'startTime', 'date', 'time', 'datetime', 'begin']);
            const end = getDate(['endDateTime', 'endDate', 'end', 'endTime', 'deadline', 'dueDate', 'finish']);

            if (start) {
                // If we have start and end, use them.
                // If only start, default to 1 hour duration.
                evts.push({
                    id: note.id,
                    title: note.title || 'Untitled',
                    start: start,
                    end: end || new Date(start.getTime() + 60 * 60 * 1000),
                    allDay: false,
                    location: props.find(p => ['location', 'geo', 'place'].includes(p.key))?.values[0]
                });
            } else if (end) {
                // Only deadline/due date, show as point event (or 1 hour ending at time?)
                // Let's show as 1 hour ending at time to be visible
                 evts.push({
                    id: note.id,
                    title: note.title || 'Untitled',
                    start: new Date(end.getTime() - 60 * 60 * 1000),
                    end: end,
                    allDay: false,
                    location: props.find(p => ['location', 'geo', 'place'].includes(p.key))?.values[0]
                });
            }
        });

        return evts;
    }, [notes, locationFilterId, filterRadius]);

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedNoteId(event.id);
        setActiveView('notes');
    };

    return (
        <div className="h-full bg-gray-900 p-4 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-4 mb-4 bg-gray-800 p-2 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 text-gray-300" title="Filter events by proximity to a location note">
                    <MapPinIcon className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-semibold hidden sm:inline">Spacetime Filter:</span>
                </div>
                <select
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 max-w-xs"
                    value={locationFilterId}
                    onChange={(e) => setLocationFilterId(e.target.value)}
                >
                    <option value="">Anywhere (Global)</option>
                    {locationNotes.map(n => (
                        <option key={n.id} value={n.id}>
                            Near {n.title || 'Untitled Location'}
                        </option>
                    ))}
                </select>
                {locationFilterId && (
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={filterRadius}
                            onChange={(e) => setFilterRadius(Number(e.target.value))}
                            className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                            min="1"
                        />
                        <span className="text-xs text-gray-500">km radius</span>
                    </div>
                )}
            </div>

            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={handleSelectEvent}
                views={['month', 'week', 'day', 'agenda']}
                defaultView='month'
            />
        </div>
    );
}
