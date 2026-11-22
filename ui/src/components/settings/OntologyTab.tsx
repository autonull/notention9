import React from 'react';
import {useSettings} from '../../hooks/useSettingsContext';

export function OntologyTab() {
    const {settings, setSettings} = useSettings();
    const ontology = settings.ontology ?? [];

    const handleAddNode = () => {
        const newNode = {
            id: `node-${Date.now()}`,
            label: 'New Concept',
            description: 'Description of the concept',
            attributes: {}
        };

        setSettings(prev => ({
            ...prev,
            ontology: [...(prev.ontology ?? []), newNode]
        }));
    };

    return (
        <div className="space-y-6">
            <div className="bg-[var(--app-surface)]/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-[var(--app-text)]">Ontology Graph</h3>
                    <button
                        onClick={handleAddNode}
                        className="bg-blue-600 hover:bg-blue-700 text-[var(--app-text)] px-3 py-1 rounded text-sm"
                    >
                        Add Node
                    </button>
                </div>
                <p className="text-[var(--app-muted)] mb-4">
                    Define the schema for your semantic network. The Gardener evolves this based on usage.
                </p>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <h4 className="font-medium text-[var(--app-text)] mb-2">Current Ontology</h4>
                        <div className="bg-[var(--app-raised)] p-4 rounded">
                            <p className="text-[var(--app-muted)] text-sm">
                                {ontology.length} nodes in your ontology
                            </p>
                            <div className="mt-2 max-h-60 overflow-y-auto">
                                {ontology.map((node, index) => (
                                    <div key={node.id} className="py-2 border-b border-[var(--app-line)] last:border-0">
                                        <div className="font-medium text-blue-300">{node.label}</div>
                                        <div className="text-xs text-[var(--app-muted)]">{node.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
