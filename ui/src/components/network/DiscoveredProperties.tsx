import React, { useMemo } from 'react';
import { ScoredMatch, OntologyNode, findAttributeDefInTree } from '@notention/core';
import { LightBulbIcon, PlusIcon } from '../ui/icons';

interface DiscoveredPropertiesProps {
    networkMatches: ScoredMatch[];
    ontology: OntologyNode[];
    onAdd: (key: string, inferredType: string) => void;
}

export function DiscoveredProperties({
    networkMatches,
    ontology,
    onAdd
}: DiscoveredPropertiesProps) {
    const unknownProperties = useMemo(() => {
        if (networkMatches.length === 0) return [];
        const uniqueKeys = new Set<string>();
        const counts = new Map<string, number>();
        const valuesMap = new Map<string, string[]>();

        for (const m of networkMatches) {
            for (const p of m.note.properties) {
                const def = findAttributeDefInTree(p.key, ontology);

                if (!def) {
                    uniqueKeys.add(p.key);
                    counts.set(p.key, (counts.get(p.key) || 0) + 1);

                    const existing = valuesMap.get(p.key) || [];
                    valuesMap.set(p.key, [...existing, ...p.values]);
                }
            }
        }

        return Array.from(uniqueKeys)
            .sort((a, b) => (counts.get(b)! - counts.get(a)!))
            .map(key => {
                const values = valuesMap.get(key) || [];
                let type = 'string';

                if (values.length > 0) {
                    const allNumbers = values.every(v => !isNaN(Number(v)) && v.trim() !== '');
                    if (allNumbers) {
                        type = 'number';
                    } else {
                        const allDates = values.every(v => !isNaN(Date.parse(v)));
                        if (allDates) {
                            type = 'date';
                        }
                    }
                }

                return { key, count: counts.get(key)!, inferredType: type };
            });
    }, [networkMatches, ontology]);

    if (unknownProperties.length === 0) {
        return null;
    }

    return (
        <div className="mb-4 bg-neutral-800/30 rounded-lg p-3 border border-neutral-700/50">
            <div className="flex items-center gap-2 mb-3">
                <LightBulbIcon className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wide">Discovered Properties</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
                {unknownProperties.map(({ key, count, inferredType }) => (
                    <div
                        key={key}
                        className="flex items-center justify-between bg-neutral-800 rounded border border-neutral-700 p-2 hover:border-neutral-600 transition-colors"
                    >
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-neutral-200 truncate" title={key}>{key}</span>
                                {count > 1 && (
                                    <span className="text-xs bg-neutral-700 text-neutral-400 px-1.5 py-0.5 rounded-full">
                                        {count}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-neutral-400 italic">
                                inferred: {inferredType}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                            <button
                                onClick={() => onAdd(key, inferredType)}
                                className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                                title={`Define as new ${inferredType} attribute`}
                            >
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
