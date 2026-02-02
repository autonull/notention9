import React, { useMemo } from 'react';
import type { Note } from '@notention/core';
import { parseGeoFromValues } from '@notention/core';
import { MapPinIcon, ClockIcon, PencilIcon } from '../common/icons';

// Simple "static" map preview using a placeholder or a very simple iframe/image if possible.
// For now, we'll just show a visual representation of the coordinates.
// Real static maps require an API key (Google/Mapbox).
// We can use a simple SVG placeholder or link to OpenStreetMap.

interface ContextPanelProps {
    note: Note;
    onPickLocation?: () => void;
    onPickTime?: (key: string) => void;
}

export function ContextPanel({ note, onPickLocation, onPickTime }: ContextPanelProps) {
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

        return { location, date, dateLabel };
    }, [note.properties]);

    if (!context.location && !context.date) return null;

    return (
        <div className="flex gap-4 p-4 bg-gray-900/30 border-b border-gray-800">
            {context.location && (
                <div className="relative group flex items-start gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700 min-w-[200px] hover:border-blue-500/50 transition-colors">
                    <div className="p-2 bg-blue-900/30 rounded-full text-blue-400">
                        <MapPinIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Location</div>
                        <div className="text-sm text-gray-200 font-mono">
                            {context.location.lat.toFixed(4)}, {context.location.lng.toFixed(4)}
                        </div>
                        <a
                            href={`https://www.openstreetmap.org/?mlat=${context.location.lat}&mlon=${context.location.lng}#map=15/${context.location.lat}/${context.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline mt-1 block"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Open Map ↗
                        </a>
                    </div>
                    {onPickLocation && (
                        <button
                            onClick={onPickLocation}
                            className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white bg-gray-700/50 hover:bg-blue-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit Location"
                        >
                            <PencilIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>
            )}

            {context.date && (
                <div className="relative group flex items-start gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700 min-w-[200px] hover:border-purple-500/50 transition-colors">
                    <div className="p-2 bg-purple-900/30 rounded-full text-purple-400">
                        <ClockIcon className="w-5 h-5" />
                    </div>
                    <div>
                         <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                             {context.dateLabel || 'Time'}
                         </div>
                         <div className="text-sm text-gray-200 font-medium">
                             {context.date.toLocaleDateString()}
                         </div>
                         <div className="text-xs text-gray-400">
                             {context.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </div>
                         <div className="text-xs text-purple-400 mt-1">
                             {(() => {
                                 const diff = context.date.getTime() - Date.now();
                                 const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                 if (diff < 0) return `Passed`;
                                 if (days === 0) return 'Today';
                                 if (days === 1) return 'Tomorrow';
                                 return `In ${days} days`;
                             })()}
                         </div>
                    </div>
                    {onPickTime && (
                        <button
                            onClick={() => onPickTime(context.dateLabel)}
                            className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white bg-gray-700/50 hover:bg-purple-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit Time"
                        >
                            <PencilIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
