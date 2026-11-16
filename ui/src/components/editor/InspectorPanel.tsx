import React, {useMemo} from 'react';
import type {Note, OntologyNode, Property} from '@notention/core';
import {parseGeoFromValues} from '@notention/core';
import {ClockIcon, MapPinIcon, GlobeIcon, SparklesIcon, SearchIcon, LinkIcon} from '../ui/icons';
import {SmartNoteAssistant} from '../SmartNoteAssistant';
import {cn} from '../../utils/ui';

interface InspectorPanelProps {
    note: Note;
    onNoteUpdate: (content: string) => void;
    properties: Note['properties'];
    onUpdateProperty?: (oldProp: Property | null, newProp: Property | null) => void;
    onPickLocation: () => void;
    onPickTime: (key: string) => void;
    ontology: OntologyNode[];
    isSidebarOpen?: boolean;
    onToggleSidebar?: () => void;
    className?: string;
}

interface ContextData {
    location: { lat: number; lng: number } | null;
    date: Date | null;
    dateLabel: string;
}

export function InspectorPanel({
    note,
    onNoteUpdate,
    properties,
    onUpdateProperty,
    onPickLocation,
    onPickTime,
    ontology,
    isSidebarOpen = false,
    onToggleSidebar,
    className = '',
}: InspectorPanelProps) {
    const context = useMemo<ContextData>(() => {
        let location: { lat: number; lng: number } | null = null;
        let date: Date | null = null;
        let dateLabel = '';

        note.properties.forEach(p => {
            const k = p.key.toLowerCase();
            if (['location', 'geo', 'place'].includes(k) && p.values[0]) {
                location = parseGeoFromValues(p.values);
            }
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

    const hasContext = context.location || context.date;

    return (
        <div className={cn('flex flex-col h-full bg-gray-900 border-l border-gray-800', className)}>
            {hasContext && (
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
                                    const diff = context.date!.getTime() - Date.now();
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
            )}

            {onToggleSidebar && (
                <div className="px-4 py-2 border-b border-gray-700/30">
                    <button
                        onClick={onToggleSidebar}
                        className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        {isSidebarOpen ? (
                            <>
                                <SearchIcon className="w-4 h-4" />
                                Hide Assistant
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-4 h-4" />
                                Show Assistant
                            </>
                        )}
                    </button>
                </div>
            )}

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <SmartNoteAssistant
                    note={note}
                    onNoteUpdate={onNoteUpdate}
                    className="flex-1 min-h-0 border-none rounded-none bg-transparent"
                    properties={properties}
                    onUpdateProperty={onUpdateProperty}
                    onPickLocation={onPickLocation}
                    onPickTime={onPickTime}
                    ontology={ontology}
                />
            </div>
        </div>
    );
}

interface InspectorSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    note: Note;
    onNoteUpdate: (content: string) => void;
    properties: Note['properties'];
    onUpdateProperty?: (oldProp: Property | null, newProp: Property | null) => void;
    onPickLocation: () => void;
    onPickTime: (key: string) => void;
    ontology: OntologyNode[];
}

export function InspectorSidebar({
    isOpen,
    onClose,
    note,
    onNoteUpdate,
    properties,
    onUpdateProperty,
    onPickLocation,
    onPickTime,
    ontology,
}: InspectorSidebarProps) {
    const sidebarClass = cn(
        'flex flex-col h-full bg-gray-900 border-l border-gray-700/50',
        'transition-all duration-300 ease-in-out transform',
        'fixed inset-y-0 right-0 z-30 shadow-2xl lg:shadow-none lg:z-0 lg:relative',
        'w-80 max-w-[85vw]',
        isOpen
            ? 'translate-x-0'
            : 'translate-x-full lg:w-0 lg:translate-x-0 lg:border-l-0 lg:overflow-hidden'
    );

    return (
        <div className={sidebarClass}>
            <InspectorPanel
                note={note}
                onNoteUpdate={onNoteUpdate}
                properties={properties}
                onUpdateProperty={onUpdateProperty}
                onPickLocation={onPickLocation}
                onPickTime={onPickTime}
                ontology={ontology}
                isSidebarOpen={isOpen}
                onToggleSidebar={onClose}
            />
        </div>
    );
}