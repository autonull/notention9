import React from 'react';
import {ArrowRightIcon} from '../common/icons';

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
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden text-left shadow-lg">
            <div className="bg-gray-900/50 p-3 border-b border-gray-700 flex justify-between items-center">
                <h4 className="font-bold text-white flex items-center gap-2">
                    <span className="text-gray-500">Note:</span>
                    {conflicts[0].noteTitle || 'Untitled Note'}
                </h4>
                <button
                    onClick={() => onSelectNote(noteId)}
                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                >
                    Edit Note <ArrowRightIcon className="w-3 h-3"/>
                </button>
            </div>
            <div className="divide-y divide-gray-700/50">
                {conflicts.map((conflict, idx) => (
                    <div key={idx}
                         className="p-4 flex items-start justify-between hover:bg-gray-700/20 transition-colors">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded">
                                    [{conflict.propertyKey}]
                                </span>
                                <span className="text-sm text-gray-400">
                                    expects <span className="text-blue-300 font-mono">{conflict.expectedType}</span>
                                </span>
                            </div>
                            <div className="text-sm text-gray-300">
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
