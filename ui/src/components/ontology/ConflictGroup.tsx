import React from 'react';
import {ArrowRightIcon} from '../ui/icons';

export interface Conflict {
    noteId: string;
    noteTitle: string;
    propertyKey: string;
    expectedType: string;
    actualValue: string;
    reason: string;
}

interface ConflictGroupProps {
    noteId: string;
    conflicts: Conflict[];
    onSelectNote: (noteId: string) => void;
}

export function ConflictGroup({noteId, conflicts, onSelectNote}: ConflictGroupProps) {
    return (
        <div className="bg-[var(--app-surface)] border border-[var(--app-line)] rounded-lg overflow-hidden text-left shadow-lg">
            <div className="bg-[var(--app-panel)] p-3 border-b border-[var(--app-line)] flex justify-between items-center">
                <h4 className="font-bold text-[var(--app-text)] flex items-center gap-2">
                    <span className="text-[var(--app-muted)]">Note:</span>
                    {conflicts[0].noteTitle || 'Untitled note'}
                </h4>
                <button
                    onClick={() => onSelectNote(noteId)}
                    className="text-xs bg-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,black)] text-[#ffffff] px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                >
                    Edit Note <ArrowRightIcon className="w-3 h-3"/>
                </button>
            </div>
            <div className="divide-y divide-[var(--app-line)]">
                {conflicts.map((conflict, idx) => (
                    <div key={idx}
                         className="p-4 flex items-start justify-between hover:bg-[var(--app-hover)] transition-colors">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded">
                                    [{conflict.propertyKey}]
                                </span>
                                <span className="text-sm text-[var(--app-muted)]">
                                    expects <span className="text-[var(--app-accent-text)] font-mono">{conflict.expectedType}</span>
                                </span>
                            </div>
                            <div className="text-sm text-[var(--app-text-secondary)]">
                                Current value: <span
                                className="text-yellow-300 font-mono bg-yellow-900/20 px-1.5 rounded">&quot;{conflict.actualValue}&quot;</span>
                            </div>
                        </div>
                        <div
                            className="text-xs font-semibold text-red-500 bg-red-900/10 px-2 py-1 rounded border border-red-900/30">
                            {conflict.reason}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
