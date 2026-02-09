import React from 'react';
import type {TimelineEvent} from './TimelineWidget';
import {CpuChipIcon, NetworkIcon, NoteIcon, SparklesIcon} from '../common/icons';

interface TimelineEventItemProps {
    event: TimelineEvent;
}

export function TimelineEventItem({event}: TimelineEventItemProps) {
    const getIcon = () => {
        switch (event.type) {
            case 'create':
            case 'update':
                return <NoteIcon className="w-3 h-3"/>;
            case 'match':
                return <SparklesIcon className="w-3 h-3"/>;
            case 'system':
                return <CpuChipIcon className="w-3 h-3"/>;
            default:
                return <NetworkIcon className="w-3 h-3"/>;
        }
    };

    const getColor = () => {
        switch (event.type) {
            case 'create':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'update':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'match':
                return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'system':
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400';
        }
    };

    return (
        <div className="relative">
            {/* Dot on timeline */}
            <div
                className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border ${getColor()} bg-gray-900`}></div>

            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-300 font-medium">{event.description}</span>
                    <span className="text-xs text-gray-500">{event.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
                {event.metadata && (
                    <div className="text-xs text-gray-500 bg-gray-800/50 p-2 rounded border border-gray-700/30">
                        {JSON.stringify(event.metadata)}
                    </div>
                )}
            </div>
        </div>
    );
}
