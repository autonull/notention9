import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {OntologyNode, OntologyAttribute} from '@notention/core';
import {SearchIcon, SparklesIcon, PlusIcon, TagIcon, ChevronRightIcon, ChevronDownIcon} from '../common/icons';
import {Input} from '../common/Input';
import {useListNavigation} from '../../hooks/useListNavigation';
import {useSelectorRegistry, PropertySelector} from './SelectorRegistry';
import {buildWidgetMetadata} from '@notention/core';

interface UnifiedSelectorOption {
    key: string;
    icon?: string;
    description?: string;
    isLearned?: boolean;
    frequency?: number;
    attributeDef?: OntologyAttribute;
    nodeLabel?: string;
    nodePath?: string[];
    depth?: number;
}

interface UnifiedSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (key: string) => void;
    ontology: OntologyNode[];
    suggestions?: Array<{key: string; frequency: number}>;
    recentKeys?: string[];
    note?: any;
}

function flattenOntology(
    nodes: OntologyNode[],
    path: string[] = [],
    depth: number = 0
): UnifiedSelectorOption[] {
    const options: UnifiedSelectorOption[] = [];

    for (const node of nodes) {
        const nodePath = [...path, node.label];
        if (node.attributes) {
            for (const [key, attr] of Object.entries(node.attributes)) {
                options.push({
                    key,
                    icon: attr.icon,
                    description: attr.description || node.label,
                    attributeDef: attr,
                    nodeLabel: node.label,
                    nodePath,
                    depth,
                });
            }
        }
        if (node.children) {
            options.push(...flattenOntology(node.children, nodePath, depth + 1));
        }
    }
    return options;
}

export function UnifiedSelector({
    isOpen,
    onClose,
    onInsert,
    ontology,
    suggestions = [],
    recentKeys = [],
    note,
}: UnifiedSelectorProps) {
    const [filter, setFilter] = useState('');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [showAll, setShowAll] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const {selectors, getMatchingSelector} = useSelectorRegistry();

    const allOptions = useMemo(() => {
        const baseOptions = flattenOntology(ontology);
        const existingKeys = new Set(baseOptions.map(o => o.key));

        if (suggestions.length > 0) {
            for (const s of suggestions) {
                if (!existingKeys.has(s.key)) {
                    baseOptions.push({
                        key: s.key,
                        description: `Learned (${s.frequency}x)`,
                        isLearned: true,
                        frequency: s.frequency,
                    });
                    existingKeys.add(s.key);
                }
            }
        }

        return baseOptions;
    }, [ontology, suggestions]);

    const filtered = useMemo(() => {
        if (!filter) {
            if (showAll) return allOptions;
            return allOptions.filter(o => o.depth === 0 || o.depth === 1);
        }
        const lowerFilter = filter.toLowerCase();
        return allOptions.filter(o =>
            o.key.toLowerCase().includes(lowerFilter) ||
            o.description?.toLowerCase().includes(lowerFilter) ||
            o.nodePath?.some(p => p.toLowerCase().includes(lowerFilter))
        );
    }, [filter, allOptions, showAll]);

    const handleSelect = (key: string) => {
        onInsert(key);
        onClose();
    };

    const handleNodeToggle = (nodeLabel: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeLabel)) next.delete(nodeLabel);
            else next.add(nodeLabel);
            return next;
        });
    };

    const totalItems = filtered.length + (filter ? 1 : 0);

    const {selectedIndex, setSelectedIndex, handleKeyDown} = useListNavigation({
        itemCount: totalItems,
        onSelect: (index) => {
            if (filter && index === filtered.length) {
                handleSelect(filter);
            } else if (filtered[index]) {
                handleSelect(filtered[index].key);
            }
        },
        onClose,
    });

    useEffect(() => {
        if (isOpen) {
            setFilter('');
            setSelectedIndex(0);
            setShowAll(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, setSelectedIndex]);

    const getWidgetType = (attr?: OntologyAttribute): string => {
        if (!attr) return 'text-input';
        const meta = buildWidgetMetadata(attr);
        return meta.type;
    };

    const renderTypeBadge = (attr?: OntologyAttribute) => {
        if (!attr) return null;
        const type = getWidgetType(attr);
        const typeLabels: Record<string, string> = {
            'text-input': 'Text',
            'number-input': 'Number',
            'datetime-picker': 'DateTime',
            'date-picker': 'Date',
            'map-picker': 'Location',
            'dropdown': 'Enum',
            'contact-selector': 'Contact',
            'boolean': 'Boolean',
        };
        return (
            <span className="text-[10px] uppercase bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded border border-gray-600">
                {typeLabels[type] || type}
            </span>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[15vh] bg-transparent" onClick={onClose}>
            <div
                className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-96 overflow-hidden flex flex-col transform transition-all animate-fade-in-up"
                onClick={e => e.stopPropagation()}
                style={{maxHeight: '500px'}}
            >
                <div className="p-3 border-b border-gray-700 bg-gray-800/95 backdrop-blur sticky top-0 z-10">
                    <Input
                        ref={inputRef}
                        type="text"
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setSelectedIndex(0);
                            setShowAll(true);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search properties..."
                        icon={SearchIcon}
                        className="w-full text-sm"
                        autoFocus
                    />
                    {!filter && allOptions.length > filtered.length && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                            <ChevronDownIcon className="w-3 h-3" />
                            Show all ({allOptions.length} properties)
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                    {recentKeys.length > 0 && !filter && (
                        <div className="mb-2">
                            <div className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Recent</div>
                            {recentKeys.map((key, i) => (
                                <button
                                    key={key}
                                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-gray-300 hover:bg-gray-700/50 border border-transparent"
                                    onClick={() => handleSelect(key)}
                                    onMouseEnter={() => setSelectedIndex(i)}
                                >
                                    <TagIcon className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium truncate text-sm">{key}</span>
                                    <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full">Recent</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {filtered.map((prop, i) => {
                        const isExpanded = expandedNodes.has(prop.nodeLabel || '');
                        const hasChildren = allOptions.some(o => o.nodePath && o.nodePath.length > (prop.nodePath?.length || 0) && o.nodePath[0] === prop.nodePath?.[0]);

                        if (prop.depth === 0 && hasChildren) {
                            return (
                                <div key={prop.key}>
                                    <button
                                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                                            isExpanded ? 'bg-gray-700/50' : 'hover:bg-gray-700/50'
                                        } border border-transparent`}
                                        onClick={() => handleNodeToggle(prop.nodeLabel || '')}
                                        onMouseEnter={() => setSelectedIndex(i)}
                                    >
                                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-lg">
                                            {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm text-gray-200">{prop.nodeLabel}</span>
                                                {prop.description && <span className="text-xs text-gray-500">{prop.description}</span>}
                                            </div>
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="pl-8 space-y-1 border-l border-gray-700/30 ml-2">
                                            {allOptions
                                                .filter(o => o.nodePath && o.nodePath[0] === prop.nodeLabel)
                                                .map((child, childIdx) => (
                                                    <button
                                                        key={child.key}
                                                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                                                            i === selectedIndex && child.key === filtered[selectedIndex]?.key
                                                                ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30'
                                                                : 'text-gray-300 hover:bg-gray-700/50 border border-transparent'
                                                        }`}
                                                        onClick={() => handleSelect(child.key)}
                                                        onMouseEnter={() => {
                                                            const globalIdx = filtered.findIndex(f => f.key === child.key);
                                                            if (globalIdx >= 0) setSelectedIndex(globalIdx);
                                                        }}
                                                    >
                                                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-lg">
                                                            {child.isLearned ? <SparklesIcon className="w-4 h-4 text-purple-400" /> : child.icon || <TagIcon className="w-4 h-4 text-gray-500" />}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium truncate text-sm">{child.key}</span>
                                                                {child.isLearned && child.frequency && (
                                                                    <span className="text-[10px] bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-700/30">
                                                                        {child.frequency}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {child.description && (
                                                                <div className="text-xs text-gray-500 truncate">{child.description}</div>
                                                            )}
                                                            {renderTypeBadge(child.attributeDef)}
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <button
                                key={prop.key}
                                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                                    i === selectedIndex
                                        ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30'
                                        : 'text-gray-300 hover:bg-gray-700/50 border border-transparent'
                                }`}
                                onClick={() => handleSelect(prop.key)}
                                onMouseEnter={() => setSelectedIndex(i)}
                            >
                                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-lg">
                                    {prop.isLearned ? <SparklesIcon className="w-4 h-4 text-purple-400" /> : prop.icon || <TagIcon className="w-4 h-4 text-gray-500" />}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium truncate text-sm">{prop.key}</span>
                                        {prop.isLearned && prop.frequency && (
                                            <span className="text-[10px] bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-700/30">
                                                {prop.frequency}
                                            </span>
                                        )}
                                    </div>
                                    {prop.description && (
                                        <div className="text-xs text-gray-500 truncate">{prop.description}</div>
                                    )}
                                    {renderTypeBadge(prop.attributeDef)}
                                </div>
                            </button>
                        );
                    })}

                    {filter && (
                        <button
                            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                                selectedIndex === filtered.length ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30' : 'text-gray-300 hover:bg-gray-700/50 border border-transparent'
                            }`}
                            onClick={() => handleSelect(filter)}
                            onMouseEnter={() => setSelectedIndex(filtered.length)}
                        >
                            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                <PlusIcon className="w-4 h-4 text-green-400" />
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm text-green-400">Create "{filter}"</div>
                                <div className="text-xs text-gray-500 truncate">Add as new custom property</div>
                            </div>
                        </button>
                    )}

                    {filtered.length === 0 && !filter && (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500 gap-2">
                            <SearchIcon className="w-6 h-6 opacity-30" />
                            <span className="text-xs">Type to search properties...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}