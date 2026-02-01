import React from 'react';
import type { TimelineEvent } from '../../hooks/useTimelineEvents';

interface TimelineEventItemProps {
    event: TimelineEvent;
    activeTab: 'upcoming' | 'history';
    onClick: (noteId: string) => void;
}

export function TimelineEventItem({ event, activeTab, onClick }: TimelineEventItemProps) {
    return (
        <div
            className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded cursor-pointer transition-colors group"
            onClick={() => onClick(event.note.id)}
        >
            <div className={`flex-shrink-0 flex flex-col items-center min-w-[3rem] border rounded p-1 ${activeTab === 'upcoming' ? 'bg-gray-800 border-gray-700' : 'bg-gray-800/50 border-gray-800 opacity-60'}`}>
                <span className={`text-xs font-bold uppercase ${activeTab === 'upcoming' ? 'text-red-400' : 'text-gray-500'}`}>{event.date.toLocaleString('default', { month: 'short' })}</span>
                <span className={`text-lg font-bold ${activeTab === 'upcoming' ? 'text-gray-200' : 'text-gray-500'}`}>{event.date.getDate()}</span>
            </div>
            <div className="flex-grow min-w-0">
                <h4 className={`text-sm font-medium truncate ${activeTab === 'upcoming' ? 'text-gray-200' : 'text-gray-500'}`}>{event.note.title || 'Untitled Note'}</h4>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    <span className="opacity-70">{event.label}:</span>
                    {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
};
