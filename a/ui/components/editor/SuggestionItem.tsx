import React, { useState } from 'react';
import { Property, parseProperties, formatPropertyTag, OntologyNode } from '@notention/core';
import { PropertyWidget } from './PropertyWidget';
import { IconButton } from '../common/IconButton';
import { CheckIcon } from '../common/icons';

interface SuggestionItemProps {
    suggestion: string;
    onAccept: (finalTag: string) => void;
    onDismiss: () => void;
    ontology: OntologyNode[];
}

export const SuggestionItem = ({ suggestion, onAccept, onDismiss, ontology }: SuggestionItemProps) => {
    const [property, setProperty] = useState<Property | null>(() => {
        const parsed = parseProperties(suggestion);
        return parsed.length > 0 ? parsed[0] : null;
    });

    if (!property) {
        return (
            <div className="flex justify-between items-center text-red-400 text-xs p-2 bg-red-900/20 rounded mb-2">
                <span>Invalid suggestion: {suggestion}</span>
                <button onClick={onDismiss} className="text-red-300 hover:text-white">Dismiss</button>
            </div>
        );
    }

    const handleAccept = () => {
        if (property) {
            onAccept(formatPropertyTag(property));
        }
    };

    return (
        <div className="flex items-center gap-2 mb-2 group">
            <div className="flex-1">
                <PropertyWidget
                    property={property}
                    onChange={setProperty}
                    onRemove={onDismiss}
                    ontology={ontology}
                    className="mb-0 border-purple-500/20 bg-gray-900/50"
                />
            </div>
            <IconButton
                icon={CheckIcon}
                onClick={handleAccept}
                size="sm"
                className="bg-green-600 hover:bg-green-500 text-white p-2 shadow-lg opacity-80 hover:opacity-100 transition-all"
                tooltip="Accept"
            />
        </div>
    );
};
