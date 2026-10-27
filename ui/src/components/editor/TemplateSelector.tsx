import React, {useMemo} from 'react';
import type {OntologyNode} from '@notention/core';
import {CubeIcon} from '../ui/icons';

interface TemplateSelectorProps {
    ontology: OntologyNode[];
    onSelect: (template: OntologyNode) => void;
    onClose: () => void;
}

const collectTemplates = (nodes: OntologyNode[]): OntologyNode[] =>
    nodes.flatMap(node => [
        ...(node.actionLabel && node.attributes ? [node] : []),
        ...collectTemplates(node.children ?? []),
    ]);

export function TemplateSelector({ontology, onSelect, onClose}: TemplateSelectorProps) {
    const templates = useMemo(() => collectTemplates(ontology), [ontology]);

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
                {templates.map(template => (
                    <button
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="text-left text-sm p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
                    >
                        <div className="font-medium">{template.actionLabel}</div>
                        <div className="text-xs text-gray-500">{template.description ?? template.label}</div>
                    </button>
                ))}
                {templates.length === 0 && (
                    <div className="text-xs text-gray-500 italic p-2">No templates found.</div>
                )}
            </div>
        </div>
    );
}
