import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Calendar, dateFnsLocalizer, type View} from 'react-big-calendar';
import {format, getDay, parse, startOfWeek} from 'date-fns';
import {enUS} from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {MapPinIcon} from '../ui/icons';
import {haversineDistance, parseGeoFromValues} from '@notention/core';
import {Skeleton} from '../ui/Skeleton';
import {EmptyState} from '../ui/Primitives';
import {Button} from '../ui/Button';

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

export function TimelineView() {
    const {notes, loading} = useNotes();
    const {setSelectedNoteId, setActiveView} = useView();
    const [locationFilterId, setLocationFilterId] = useState<string>('');
    const [filterRadius, setFilterRadius] = useState<number>(50); // km
    const [date, setDate] = useState(() => new Date());
    const [view, setView] = useState<View>('month');
    const anchored = useRef(false);

    // Get all notes that have a location property
    const locationNotes = useMemo(() => {
        return notes.filter(n => n.properties.some(p => ['location', 'geo', 'place'].includes(p.key) && p.values[0]));
    }, [notes]);

    const events = useMemo(() => {
        const evts: CalendarEvent[] = [];

        // If filtering by location, get the reference location
        let filterCoords: { lat: number, lng: number } | null = null;
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
                evts.push({
                    id: note.id,
                    title: note.title || 'Untitled',
                    start: start,
                    end: end || new Date(start.getTime() + 60 * 60 * 1000), // Default 1h
                    allDay: false,
                    location: props.find(p => ['location', 'geo', 'place'].includes(p.key))?.values[0]
                });
            } else if (end) {
                evts.push({
                    id: note.id,
                    title: note.title || 'Untitled',
                    start: new Date(end.getTime() - 60 * 60 * 1000), // 1h before deadline
                    end: end,
                    allDay: false,
                    location: props.find(p => ['location', 'geo', 'place'].includes(p.key))?.values[0]
                });
            }
        });

        return evts;
    }, [notes, locationFilterId, filterRadius]);

    const orderedEvents = useMemo(
        () => [...events].sort((a, b) => a.start.getTime() - b.start.getTime()),
        [events],
    );

    const latestEvent = orderedEvents[orderedEvents.length - 1] ?? null;
    const nextEvent = useMemo(
        () => orderedEvents.find(event => event.start.getTime() >= Date.now()) ?? null,
        [orderedEvents],
    );
    const anchorDate = nextEvent?.start ?? latestEvent?.start ?? null;

    useEffect(() => {
        if (anchored.current || !anchorDate) return;
        anchored.current = true;
        setDate(anchorDate);
    }, [anchorDate]);

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedNoteId(event.id);
        setActiveView('notes');
    };

    if (loading) {
        return (
            <div className="h-full bg-gray-900 p-4 flex flex-col overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 mb-4 bg-gray-800 p-2 rounded-lg border border-gray-700">
                    <Skeleton variant="rectangular" height={40} width={120} className="rounded-lg"/>
                    <Skeleton variant="rectangular" height={40} width={160} className="rounded-lg"/>
                    <Skeleton variant="rectangular" height={40} width={100} className="rounded-lg"/>
                </div>
                <div className="flex-1 bg-gray-800/50 rounded-lg p-4 animate-pulse-subtle">
                    <div className="space-y-3">
                        {Array.from({length: 6}).map((_, i) => (
                            <div key={i} className="h-8 bg-gray-700/50 rounded animate-shimmer"/>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-950 p-4 flex flex-col overflow-hidden">
            <div className="flex-none flex flex-wrap items-center gap-x-3 gap-y-2 mb-3 text-sm text-gray-400">
                <div
                    className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900/60 pl-2 pr-1"
                    title="Filter events by proximity to a location note"
                >
                    <MapPinIcon className="w-4 h-4 text-blue-400"/>
                    <select
                        aria-label="Filter by location"
                        className="bg-transparent py-1 text-sm text-gray-200 focus:outline-none max-w-[14rem]"
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
                </div>
                {locationFilterId && (
                    <label className="flex items-center gap-1">
                        <input
                            type="number"
                            aria-label="Radius in kilometres"
                            value={filterRadius}
                            onChange={(e) => setFilterRadius(Number(e.target.value))}
                            className="w-14 bg-transparent border-b border-gray-700 px-1 py-0.5 text-sm text-white focus:outline-none focus:border-blue-500"
                            min="1"
                        />
                        <span className="text-xs text-gray-500">km</span>
                    </label>
                )}

                {events.length > 0 && (
                    <>
                        <span aria-hidden="true" className="text-gray-700">·</span>
                        <span>
                            {events.length} dated note{events.length === 1 ? '' : 's'}
                        </span>
                        <span className="min-w-0 truncate">
                            {nextEvent
                                ? `Next: ${nextEvent.title} — ${format(nextEvent.start, 'MMM d, HH:mm')}`
                                : latestEvent && `Latest: ${format(latestEvent.start, 'MMM d, yyyy')}`}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => anchorDate && setDate(anchorDate)}
                        >
                            {nextEvent ? 'Jump to next' : 'Jump to latest'}
                        </Button>
                    </>
                )}
            </div>

            {events.length === 0 ? (
                <EmptyState
                    variant="minimal"
                    title="No dated notes yet"
                    description="Add a start or deadline detail to a note to see it on the calendar."
                    action={<Button variant="primary" onClick={() => setActiveView('inbox')}>Go to capture</Button>}
                />
            ) : (
                <div className="flex-1 min-h-0 overflow-hidden">
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{height: '100%'}}
                        date={date}
                        onNavigate={setDate}
                        view={view}
                        onView={setView}
                        onSelectEvent={handleSelectEvent}
                        views={['month', 'week', 'day', 'agenda']}
                    />
                </div>
            )}
        </div>
    );
}
