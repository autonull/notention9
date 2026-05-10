import React, {useMemo} from 'react';
import type {Note} from '@notention/core';
import {parseGeoFromValues} from '@notention/core';
import {ClockIcon, MapPinIcon, PencilIcon, GlobeIcon} from '../common/icons';

// Simple "static" map preview using a placeholder or a very simple iframe/image if possible.
// For now, we'll just show a visual representation of the coordinates.
// Real static maps require an API key (Google/Mapbox).
// We can use a simple SVG placeholder or link to OpenStreetMap.

interface ContextPanelProps {
    note: Note;
    onPickLocation?: () => void;
    onPickTime?: (key: string) => void;
}

export function ContextPanel({note, onPickLocation, onPickTime}: ContextPanelProps) {
    const context = useMemo(() => {
        let location: { lat: number, lng: number } | null = null;
        let date: Date | null = null;
        let dateLabel = '';

        note.properties.forEach(p => {
            const k = p.key.toLowerCase();
            // Location
            if (['location', 'geo', 'place'].includes(k) && p.values[0]) {
                location = parseGeoFromValues(p.values);
            }
            // Date
            if (['date', 'time', 'deadline', 'start', 'end', 'due'].some(match => k.includes(match)) && p.values[0]) {
                const d = new Date(p.values[0]);
                if (!isNaN(d.getTime())) {
                    date = d;
                    dateLabel = p.key;
                }
            }
        });

        return {location, date, dateLabel};
    }, [note.properties]);

    if (!context.location && !context.date) return null;

    return (
        <div className="flex flex-wrap gap-2 px-8 py-3 bg-gray-900/50 border-b border-gray-700/30">
            {context.location && (
                <div
                    className="group flex items-center gap-2 px-2.5 py-1.5 bg-blue-900/10 border border-blue-500/20 rounded-full hover:bg-blue-900/20 transition-all cursor-pointer"
                    onClick={onPickLocation}
                >
                    <MapPinIcon className="w-3.5 h-3.5 text-blue-400"/>
                    <span className="text-[11px] font-medium text-blue-200">
                        {context.location.lat.toFixed(3)}, {context.location.lng.toFixed(3)}
                    </span>
                    <a
                        href={`https://www.openstreetmap.org/?mlat=${context.location.lat}&mlon=${context.location.lng}#map=15/${context.location.lat}/${context.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-0.5 text-blue-500 hover:text-blue-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GlobeIcon className="w-3 h-3"/>
                    </a>
                </div>
            )}

            {context.date && (
                <div
                    className="group flex items-center gap-2 px-2.5 py-1.5 bg-purple-900/10 border border-purple-500/20 rounded-full hover:bg-purple-900/20 transition-all cursor-pointer"
                    onClick={() => onPickTime?.(context.dateLabel)}
                >
                    <ClockIcon className="w-3.5 h-3.5 text-purple-400"/>
                    <span className="text-[11px] font-medium text-purple-200">
                        {context.date.toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-purple-400/80 uppercase font-bold">
                        {(() => {
                            const diff = context.date.getTime() - Date.now();
                            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            if (diff < 0) return `Passed`;
                            if (days === 0) return 'Today';
                            if (days === 1) return 'Tomorrow';
                            return `In ${days}d`;
                        })()}
                    </span>
                </div>
            )}
        </div>
    );
};
