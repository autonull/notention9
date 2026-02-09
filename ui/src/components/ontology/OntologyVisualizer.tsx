import React, {useState} from 'react';
import {OntologyNode} from '@notention/core';
import {useSettings} from '../../hooks/useSettingsContext';

interface OntologyVisualizerProps {
    className?: string;
}

export const OntologyVisualizer: React.FC<OntologyVisualizerProps> = ({className = ''}) => {
    const {settings} = useSettings();
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    const filteredOntology = settings.ontology.filter(node =>
        node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.attributes && Object.keys(node.attributes).some(attr =>
            attr.toLowerCase().includes(searchTerm.toLowerCase())
        ))
    );

    const renderNode = (node: OntologyNode, depth: number = 0) => {
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const hasAttributes = node.attributes && Object.keys(node.attributes).length > 0;

        return (
            <div key={node.id} className={`${depth > 0 ? 'ml-' + depth * 4 : ''}`}>
                <div
                    className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-700 ${
                        isExpanded ? 'bg-gray-700' : 'bg-gray-800'
                    }`}
                    onClick={() => toggleNode(node.id)}
                >
                    {hasChildren && (
                        <span className="mr-2">
              {isExpanded ? '▼' : '►'}
            </span>
                    )}
                    <div className="flex-1">
                        <div className="font-medium text-white">{node.label}</div>
                        {node.description && (
                            <div className="text-xs text-gray-400">{node.description}</div>
                        )}
                    </div>
                </div>

                {isExpanded && (
                    <div className="pl-4 border-l border-gray-700">
                        {/* Render attributes */}
                        {hasAttributes && (
                            <div className="mt-2 space-y-1">
                                {Object.entries(node.attributes!).map(([attrKey, attrValue]) => (
                                    <div key={attrKey} className="p-2 bg-gray-800 rounded text-sm">
                                        <div className="font-mono text-blue-300">{attrKey}</div>
                                        <div className="text-xs text-gray-400">
                                            {attrValue.type} | {attrValue.description}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Operators: {attrValue.operators.real.join(', ')} (real), {attrValue.operators.imaginary.join(', ')} (imaginary)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Render children */}
                        {hasChildren && node.children!.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
            <div className="mb-4">
                <h3 className="text-lg font-bold text-white mb-2">Ontology Explorer</h3>
                <p className="text-sm text-gray-400 mb-3">
                    Visualize the emergent schema. Real properties (facts) vs imaginary properties (constraints).
                </p>
                <input
                    type="text"
                    placeholder="Search ontology..."
                    className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredOntology.map(node => renderNode(node))}
            </div>

            <div className="mt-4 text-xs text-gray-500">
                <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span>Real Properties (facts: [key:is:value])</span>
                </div>
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span>Imaginary Properties (constraints: [key &lt; value], [key contains value])</span>
                </div>
            </div>
        </div>
    );
};