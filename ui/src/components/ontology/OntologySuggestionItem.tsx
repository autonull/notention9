import React, { useState } from 'react';
import { SuggestedAttribute } from '@notention/core';
import {Button} from '../ui/Button';
import { PlusIcon } from '../ui/icons';

interface OntologySuggestionItemProps {
    suggestion: SuggestedAttribute;
    onAdd: () => void;
}

export function OntologySuggestionItem({
    suggestion,
    onAdd
}: OntologySuggestionItemProps) {
    return (
        <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 flex justify-between items-center group hover:border-blue-500/50 transition-colors">
            <div>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-300 font-bold">{suggestion.key}</span>
 <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        suggestion.type === 'number' ? 'bg-orange-900/30 text-orange-300' :
                        suggestion.type === 'date' ? 'bg-purple-900/30 text-purple-300' :
                        suggestion.type === 'geo' ? 'bg-teal-900/30 text-teal-300' :
                        'bg-neutral-700 text-neutral-400'
                    }`}>
                        {suggestion.type}
                    </span>
                </div>
                <div className="text-sm text-neutral-400 mt-1 flex gap-3 items-center">
                    <span>Used {suggestion.frequency}x</span>
                    <span className="text-neutral-400">•</span>
                    <span>Confidence: {Math.round(suggestion.confidence * 100)}%</span>
                </div>
                {suggestion.parentContext && (
                    <div className="text-xs text-green-400/80 mt-1 flex items-center gap-1">
                        Context: <span className="font-semibold text-green-300">{suggestion.parentContext}</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <Button
                    size="sm"
                    variant="secondary"
                    icon={PlusIcon}
                    onClick={onAdd}
                    className="hover:bg-blue-900/30 hover:text-blue-200 hover:border-blue-800/50"
                >
                    Review & Add
                </Button>
            </div>
        </div>
    );
}
