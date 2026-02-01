import React from 'react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { SparklesIcon, PlusIcon } from '../common/icons';

export interface EmergingConcept {
    key: string;
    frequency: number;
    sampleValues: string[];
}

interface EmergingConceptsWidgetProps {
    concepts: EmergingConcept[];
    onPromote: (concept: EmergingConcept) => void;
}

export function EmergingConceptsWidget({ concepts, onPromote }: EmergingConceptsWidgetProps) {
    if (concepts.length === 0) return null;

    return (
        <Card title="Emerging Concepts" icon={SparklesIcon} variant="glass" className="mb-4">
            <div className="space-y-3">
                <p className="text-xs text-gray-400">
                    These properties appear frequently but aren't in your official ontology yet.
                </p>
                {concepts.map((concept) => (
                    <div key={concept.key} className="flex items-center justify-between p-2 bg-gray-800/50 rounded border border-gray-700/30">
                        <div>
                            <span className="font-mono text-blue-300 font-bold">{concept.key}</span>
                            <span className="text-xs text-gray-500 ml-2">({concept.frequency} uses)</span>
                            <div className="text-xs text-gray-400 mt-1 truncate max-w-[200px]">
                                e.g. {concept.sampleValues.join(', ')}
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="primary"
                            icon={PlusIcon}
                            onClick={() => onPromote(concept)}
                            className="bg-blue-600/80 hover:bg-blue-500"
                        >
                            Promote
                        </Button>
                    </div>
                ))}
            </div>
        </Card>
    );
}
