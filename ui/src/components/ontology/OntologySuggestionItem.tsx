import React, { useState } from 'react';
import { SuggestedAttribute } from '@notention/core';
import { Button } from '../common/Button';
import { PlusIcon } from '../common/icons';

interface OntologySuggestionItemProps {
    suggestion: SuggestedAttribute;
    onAdd: () => void;
}

export const OntologySuggestionItem: React.FC<OntologySuggestionItemProps> = ({
    suggestion,
    onAdd
}) => {
    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center group hover:border-blue-500/50 transition-colors">
            <div>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-300 font-bold">{suggestion.key}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
                        suggestion.type === 'number' ? 'bg-orange-900/30 text-orange-300' :
                        suggestion.type === 'date' ? 'bg-purple-900/30 text-purple-300' :
                        suggestion.type === 'geo' ? 'bg-teal-900/30 text-teal-300' :
                        'bg-gray-700 text-gray-400'
                    }`}>
                        {suggestion.type}
                    </span>
                </div>
                <div className="text-sm text-gray-400 mt-1 flex gap-3 items-center">
                    <span>Used {suggestion.frequency}x</span>
                    <span className="text-gray-600">•</span>
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
};
