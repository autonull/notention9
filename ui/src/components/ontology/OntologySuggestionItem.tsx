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
        <div className="bg-[var(--app-surface)] p-4 rounded-lg border border-[var(--app-line)] flex justify-between items-center group hover:border-[var(--app-accent-line)] transition-colors">
            <div>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[var(--app-accent-text)] font-bold">{suggestion.key}</span>
 <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        suggestion.type === 'number' ? 'bg-orange-900/30 text-orange-300' :
                        suggestion.type === 'date' ? 'bg-purple-900/30 text-purple-300' :
                        suggestion.type === 'geo' ? 'bg-teal-900/30 text-teal-300' :
                        'bg-[var(--app-raised)] text-[var(--app-muted)]'
                    }`}>
                        {suggestion.type}
                    </span>
                </div>
                <div className="text-sm text-[var(--app-muted)] mt-1 flex gap-3 items-center">
                    <span>Used {suggestion.frequency}x</span>
                    <span className="text-[var(--app-muted)]">•</span>
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
                    className="hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] hover:border-[var(--app-accent-line)]"
                >
                    Review & Add
                </Button>
            </div>
        </div>
    );
}
