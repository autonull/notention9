import React, {useMemo} from 'react';
import {Conflict, ConflictGroup} from './ConflictGroup';

interface OntologyConflictsProps {
    conflicts: Conflict[];
    onSelectNote: (noteId: string) => void;
}

export function OntologyConflicts({conflicts, onSelectNote}: OntologyConflictsProps) {
    // Group conflicts by Note ID
    const groupedConflicts = useMemo(() => {
        const groups: Record<string, Conflict[]> = {};
        conflicts.forEach(c => {
            if (!groups[c.noteId]) {
                groups[c.noteId] = [];
            }
            groups[c.noteId].push(c);
        });
        return groups;
    }, [conflicts]);

    return (
        <div className="flex flex-col items-center justify-start h-full text-center text-gray-400 pt-4">
            {conflicts.length > 0 ? (
                <div className="w-full max-w-4xl space-y-6 pb-8">
                    <div
                        className="bg-red-900/20 border border-red-900/50 p-4 rounded-lg flex items-center gap-4 text-left">
                        <div className="text-3xl">⚠️</div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Conflicts Detected</h3>
                            <p className="text-sm text-gray-400">
                                Found {conflicts.length} issues across {Object.keys(groupedConflicts).length} notes.
                                These properties do not match the expected types defined in your Ontology.
                            </p>
                        </div>
                    </div>

                    {Object.entries(groupedConflicts).map(([noteId, noteConflicts]) => (
                        <ConflictGroup
                            key={noteId}
                            noteId={noteId}
                            conflicts={noteConflicts}
                            onSelectNote={onSelectNote}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 opacity-50">
                    <div className="text-green-500 mb-4 text-5xl">✓</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Conflicts</h3>
                    <p className="max-w-md">
                        All notes align perfectly with your Ontology.
                    </p>
                </div>
            )}
        </div>
    );
};
