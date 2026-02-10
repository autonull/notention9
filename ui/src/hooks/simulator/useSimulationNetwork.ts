import React, {useCallback, useState} from 'react';
import type {Note, OntologyAttribute, OntologyNode} from '@notention/core';
import {addAttribute, getSubtreeKeys, Logger, matchingService, parseProperties} from '@notention/core';
import type {Gardener} from '../../services/gardener';

export interface Log {
    msg: string;
    type: 'info' | 'match' | 'ontology' | 'reuse';
}

export const useSimulationNetwork = (
    ontologyRef: React.MutableRefObject<OntologyNode[]>,
    setOntology: React.Dispatch<React.SetStateAction<OntologyNode[]>>,
    gardenerRef: React.MutableRefObject<Gardener | null>
) => {
    const [networkNotes, setNetworkNotes] = useState<Note[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [notifications, setNotifications] = useState<Record<string, string[]>>({});
    const [newAttributes, setNewAttributes] = useState<{ key: string; type: string }[]>([]);

    const addLog = useCallback((msg: string, type: 'info' | 'match' | 'ontology' | 'reuse') =>
        setLogs(prev => [{msg, type}, ...prev].slice(0, 20)), []);

    const handlePublish = useCallback(async (note: Note) => {
        // 1. Enrich Note
        const properties = parseProperties(note.content);
        const enrichedNote = {...note, properties};

        setNetworkNotes(prev => {
            // Prevent duplicates
            const filtered = prev.filter(n => n.id !== enrichedNote.id);
            const newNotes = [enrichedNote, ...filtered];

            // 2. Run Matching Logic
            // Only match against OTHER notes
            for (const otherNote of filtered) {
                const result1 = matchingService.matchNotes(enrichedNote, otherNote);
                const result2 = matchingService.matchNotes(otherNote, enrichedNote);

                if (result1.score > 0.5 || result2.score > 0.5) {
                    addLog(`MATCH: ${enrichedNote.id.slice(0, 4)} <-> ${otherNote.id.slice(0, 4)}`, 'match');

                    // Simulate "Contact" action
                    setTimeout(() => {
                        addLog(`💬 Agent contacting peer...`, 'info');
                    }, 1000);

                    setNotifications(n => ({
                        ...n,
                        '1': [...(n['1'] || []), `Match found!`],
                        '2': [...(n['2'] || []), `Match found!`]
                    }));
                }
            }

            return newNotes;
        });

        // 3. Evolve Ontology
        if (gardenerRef.current) {
            try {
                const newAttrs = await gardenerRef.current.evolveOntology([enrichedNote]);

                // Only add if not exists
                const currentOntology = ontologyRef.current;
                const existingKeys = new Set(
                    currentOntology.flatMap(node => Array.from(getSubtreeKeys(node)))
                );

                const novelAttrs = newAttrs.filter(a => !existingKeys.has(a.key));

                if (novelAttrs.length > 0) {
                    setOntology(prevOntology => {
                        let newOntology = [...prevOntology];
                        const targetNodeId = newOntology[0]?.id || 'root';

                        for (const attr of novelAttrs) {
                            addLog(`Ontology + ${attr.key}`, 'ontology');
                            setNewAttributes(prev => [{key: attr.key, type: attr.type}, ...prev].slice(0, 10));

                            const ontAttr: OntologyAttribute = {
                                type: attr.type,
                                description: attr.description,
                                operators: {real: ['is'], imaginary: []}
                            };
                            newOntology = addAttribute(newOntology, targetNodeId, attr.key, ontAttr);
                        }
                        return newOntology;
                    });
                }
            } catch (e) {
                Logger.getInstance().error("Gardener Error:", e instanceof Error ? e : new Error(String(e)));
            }
        }
    }, [addLog, gardenerRef, ontologyRef, setOntology]);

    return {
        networkNotes,
        logs,
        notifications,
        newAttributes,
        handlePublish,
        addLog,
        setNetworkNotes // Export this
    };
};
