import React from 'react';
import {TiptapEditor} from '../editor/TiptapEditor';
import type {Note} from '@notention/core';
import {useAgentSessionLogic} from '../../hooks/simulator/useAgentSessionLogic';
import {CpuChipIcon} from '../common/icons';
import {SessionSidebar} from './SessionSidebar';
import {SessionHeader} from './SessionHeader';

interface Props {
    agentName: string;
    currentDraft: string;
    onDraftChange: (text: string) => void;
    status: string;
    onPublish: (note: Note) => void;
    notifications: string[];
    minimal?: boolean;
}

export function AgentSessionView({
                                     agentName,
                                     currentDraft,
                                     onDraftChange,
                                     status,
                                     onPublish,
                                     notifications,
                                     minimal = false
                                 }: Props) {
    const {
        notes,
        addNote,
        activeNote,
        setActiveNote,
        displayNote,
        settings
    } = useAgentSessionLogic({status, onPublish, currentDraft});

    return (
        <div
            className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-sm relative transition-colors duration-500">

            {/* Notifications Overlay */}
            {notifications.length > 0 && (
                <div className="absolute top-10 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                    {notifications.map((msg, i) => (
                        <div key={i}
                             className="bg-blue-600/90 backdrop-blur text-white text-xs px-3 py-2 rounded shadow-lg animate-slide-in-up border border-blue-400/50 flex items-center gap-2">
                            <span>🔔</span> {msg}
                        </div>
                    ))}
                </div>
            )}

            <SessionHeader
                agentName={agentName}
                status={status}
                minimal={minimal}
            />

            <div className="flex flex-grow overflow-hidden">
                <SessionSidebar
                    notes={notes}
                    activeNote={activeNote}
                    setActiveNote={setActiveNote}
                    addNote={addNote}
                />

                {/* Editor Area */}
                <div className="flex-1 bg-gray-900 relative overflow-y-auto custom-scrollbar flex flex-col">
                    {displayNote ? (
                        <div className={`flex-1 ${minimal ? 'p-2' : 'p-4'}`}>
                            <TiptapEditor
                                note={displayNote}
                                onSave={(content) => {
                                    onDraftChange(content);
                                }}
                                ontology={settings.ontology}
                                minimal={minimal}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-600 flex-col gap-2">
                            <CpuChipIcon className="w-8 h-8 opacity-20"/>
                            <span className="text-xs italic">Initializing agent session...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div
                className="bg-gray-950 px-3 py-1 text-[9px] text-gray-600 flex justify-between border-t border-gray-800 font-mono">
                <span>{notes.length} Notes</span>
                <span>ID: {activeNote?.id.slice(0, 8)}...</span>
            </div>
        </div>
    );
};
