import React from 'react';
import type {OntologyNode} from '@notention/core';
import {CubeIcon} from '../common/icons';

interface TemplateSelectorProps {
    ontology: OntologyNode[];
    onSelect: (template: OntologyNode) => void;
    onClose: () => void;
}

export function TemplateSelector({ontology, onSelect, onClose}: TemplateSelectorProps) {
    const templates = ontology.find(n => n.id === 'templates')?.children || [];

    return (
        <div
            className="absolute top-14 left-4 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 w-64 animate-fade-in">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                    <CubeIcon className="w-4 h-4"/>
                    Templates
                </h3>
                <button onClick={onClose} className="text-gray-500 hover:text-white">&times;</button>
            </div>
            <div className="flex flex-col gap-2">
                {templates.map(tmpl => (
                    <button
                        key={tmpl.id}
                        onClick={() => onSelect(tmpl)}
                        className="text-left text-sm p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
                    >
                        <div className="font-medium">{tmpl.label}</div>
                        <div className="text-xs text-gray-500">{tmpl.description}</div>
                    </button>
                ))}
                {templates.length === 0 && (
                    <div className="text-xs text-gray-500 italic p-2">No templates found.</div>
                )}
            </div>
        </div>
    );
};
