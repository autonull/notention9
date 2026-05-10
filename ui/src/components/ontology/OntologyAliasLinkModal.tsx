import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { OntologyNode } from '@notention/core';
import { levenshteinDistance } from '../../utils/stringUtils';
import { SparklesIcon } from '../common/icons';

interface OntologyAliasLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (nodeId: string, attributeKey: string) => void;
    aliasCandidate: string;
    ontology: OntologyNode[];
}

interface SelectableAttribute {
    nodeId: string;
    nodeLabel: string;
    key: string;
    description?: string;
    score?: number; // Similarity score (0-1)
}

export function OntologyAliasLinkModal({
    isOpen,
    onClose,
    onConfirm,
    aliasCandidate,
    ontology
}: OntologyAliasLinkModalProps) {
    const [selectedAttribute, setSelectedAttribute] = useState<string>(''); // format: "nodeId:key"
    const [searchTerm, setSearchTerm] = useState('');

    const attributes = useMemo(() => {
        const result: SelectableAttribute[] = [];
        const traverse = (list: OntologyNode[]) => {
            for (const node of list) {
                if (node.attributes) {
                    Object.entries(node.attributes).forEach(([key, attr]) => {
                        // Calculate similarity score
                        const dist = levenshteinDistance(aliasCandidate.toLowerCase(), key.toLowerCase());
                        const maxLen = Math.max(aliasCandidate.length, key.length);
                        const score = 1 - (dist / maxLen);

                        result.push({
                            nodeId: node.id,
                            nodeLabel: node.label,
                            key,
                            description: attr.description,
                            score
                        });
                    });
                }
                if (node.children) traverse(node.children);
            }
        }
        traverse(ontology);

        // Sort by similarity score descending, then alphabetical
        return result.sort((a, b) => {
            if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
            return a.key.localeCompare(b.key);
        });
    }, [ontology, aliasCandidate]);

    const filteredAttributes = useMemo(() => {
        if (!searchTerm) return attributes;
        const lower = searchTerm.toLowerCase();
        return attributes.filter(a =>
            a.key.toLowerCase().includes(lower) ||
            a.nodeLabel.toLowerCase().includes(lower) ||
            a.description?.toLowerCase().includes(lower)
        );
    }, [attributes, searchTerm]);

    const handleConfirm = () => {
        if (!selectedAttribute) return;
        const [nodeId, key] = selectedAttribute.split(':');
        onConfirm(nodeId, key);
        onClose();
    };

    // Auto-select best match if high confidence and not searching
    const topMatch = attributes[0];
    const hasHighConfidenceMatch = topMatch && (topMatch.score || 0) > 0.7;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Link Alias: ${aliasCandidate}`}>
            <div className="space-y-4">
                <p className="text-sm text-gray-300">
                    Select the existing attribute that <strong>{aliasCandidate}</strong> is an alias for.
                </p>

                {hasHighConfidenceMatch && !searchTerm && (
                    <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-3 mb-2">
                        <div className="flex items-center gap-2 mb-2 text-purple-300 text-xs uppercase font-bold">
                            <SparklesIcon className="w-3 h-3" />
                            Suggested Match
                        </div>
                        <div
                            onClick={() => setSelectedAttribute(`${topMatch.nodeId}:${topMatch.key}`)}
                            className={`
                                p-2 cursor-pointer rounded border border-purple-700/50 flex flex-col bg-gray-900/50 hover:bg-gray-800 transition-colors
                                ${selectedAttribute === `${topMatch.nodeId}:${topMatch.key}` ? 'ring-2 ring-purple-500' : ''}
                            `}
                        >
                            <div className="flex justify-between items-baseline">
                                <span className="font-bold text-white">{topMatch.key}</span>
                                <span className="text-[10px] text-gray-400">{topMatch.nodeLabel}</span>
                            </div>
                            {topMatch.description && (
                                <span className="text-xs text-gray-400 truncate">{topMatch.description}</span>
                            )}
                        </div>
                    </div>
                )}

                <div>
                    <input
                        type="text"
                        placeholder="Search attributes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        autoFocus
                    />

                    <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-md bg-gray-900/50">
                        {filteredAttributes.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500 text-center">No attributes found.</div>
                        ) : (
                            filteredAttributes.map(attr => {
                                const id = `${attr.nodeId}:${attr.key}`;
                                const isSelected = selectedAttribute === id;
                                return (
                                    <div
                                        key={id}
                                        onClick={() => setSelectedAttribute(id)}
                                        className={`
                                            p-2 cursor-pointer border-b border-gray-800 last:border-b-0 flex flex-col
                                            ${isSelected ? 'bg-blue-900/40' : 'hover:bg-gray-800'}
                                        `}
                                    >
                                        <div className="flex justify-between items-baseline">
                                            <span className={`font-medium ${isSelected ? 'text-blue-300' : 'text-gray-200'}`}>
                                                {attr.key}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {attr.score && attr.score > 0.5 && (
                                                    <span className="text-[10px] text-green-500">
                                                        {Math.round(attr.score * 100)}%
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                                                    {attr.nodeLabel}
                                                </span>
                                            </div>
                                        </div>
                                        {attr.description && (
                                            <span className="text-xs text-gray-400 truncate">
                                                {attr.description}
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                    <Button
                        onClick={onClose}
                        variant="secondary"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        variant="primary"
                        disabled={!selectedAttribute}
                    >
                        Link Alias
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
