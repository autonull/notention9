import React from 'react';
import {CommunityWindow} from './CommunityWindow';
import {SystemDashboard} from './SystemDashboard';
import type {Log} from './dashboard/SystemEventsLog';
import type {Note} from '@notention/core';

interface SimulatorOverviewProps {
    networkNotes: Note[];
    onSaveNote: (note: Note) => void;
    logs: Log[];
    optimizeOntology: () => void;
    newAttributes: { key: string; type: string }[];
}

export function SimulatorOverview({
                                      networkNotes,
                                      onSaveNote,
                                      logs,
                                      optimizeOntology,
                                      newAttributes
                                  }: SimulatorOverviewProps) {
    return (
        <div className="h-full grid grid-cols-2 gap-2">
            {/* Community Stream */}
            <div className="col-span-1 h-full overflow-hidden flex flex-col">
                <div className="mb-2 font-bold text-gray-400 text-xs px-1">COMMUNITY STREAM</div>
                <CommunityWindow networkNotes={networkNotes} onSaveNote={onSaveNote}/>
            </div>

            <SystemDashboard
                logs={logs}
                optimizeOntology={optimizeOntology}
                newAttributes={newAttributes}
            />
        </div>
    );
};
