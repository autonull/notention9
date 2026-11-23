import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {OntologyNode, OntologyAttribute, Note} from '@notention/core';
import {SearchIcon, SparklesIcon, PlusIcon, TagIcon, ChevronRightIcon, ChevronDownIcon} from '../ui/icons';
import {Input} from '../ui/Input';
import {Modal} from '../ui/Modal';
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
    note?: Note;
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
 <span className="text-xs bg-[var(--app-raised)] text-[var(--app-muted)] px-1.5 py-0.5 rounded border border-[var(--app-line-strong)]">
                {typeLabels[type] || type}
            </span>
        );
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            placement="top"
            size="md"
            showCloseButton={false}
            className="w-96 max-w-[calc(100vw-2rem)]"
            bodyVariant="flush"
        >
            <div className="p-3 border-b border-[var(--app-line)] bg-[var(--app-panel)]/95 backdrop-blur">
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
                            className="mt-2 text-xs text-[var(--app-accent-text)] hover:text-[var(--app-text)] flex items-center gap-1"
                        >
                            <ChevronDownIcon className="w-3 h-3" />
                            Show all ({allOptions.length} properties)
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                    {recentKeys.length > 0 && !filter && (
                        <div className="mb-2">
 <div className="px-2 py-1 text-xs font-bold text-[var(--app-muted)] tracking-wider">Recent</div>
                            {recentKeys.map((key, i) => (
                                <button
                                    key={key}
                                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)] border border-transparent"
                                    onClick={() => handleSelect(key)}
                                    onMouseEnter={() => setSelectedIndex(i)}
                                >
                                    <TagIcon className="w-4 h-4 text-[var(--app-muted)]" />
                                    <span className="font-medium truncate text-sm">{key}</span>
                                    <span className="text-xs bg-[var(--app-raised)] text-[var(--app-muted)] px-1.5 py-0.5 rounded-full">Recent</span>
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
                                            isExpanded ? 'bg-[var(--app-hover)]' : 'hover:bg-[var(--app-hover)]'
                                        } border border-transparent`}
                                        onClick={() => handleNodeToggle(prop.nodeLabel || '')}
                                        onMouseEnter={() => setSelectedIndex(i)}
                                    >
                                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-lg">
                                            {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-[var(--app-muted)]" /> : <ChevronRightIcon className="w-4 h-4 text-[var(--app-muted)]" />}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm text-[var(--app-text)]">{prop.nodeLabel}</span>
                                                {prop.description && <span className="text-xs text-[var(--app-muted)]">{prop.description}</span>}
                                            </div>
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="pl-8 space-y-1 border-l border-[var(--app-line)]/30 ml-2">
                                            {allOptions
                                                .filter(o => o.nodePath && o.nodePath[0] === prop.nodeLabel)
                                                .map((child, childIdx) => (
                                                    <button
                                                        key={child.key}
                                                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                                                            i === selectedIndex && child.key === filtered[selectedIndex]?.key
                                                                ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent-text)] border border-[var(--app-accent-line)]'
                                                                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)] border border-transparent'
                                                        }`}
                                                        onClick={() => handleSelect(child.key)}
                                                        onMouseEnter={() => {
                                                            const globalIdx = filtered.findIndex(f => f.key === child.key);
                                                            if (globalIdx >= 0) setSelectedIndex(globalIdx);
                                                        }}
                                                    >
                                                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-lg">
                                                            {child.isLearned ? <SparklesIcon className="w-4 h-4 text-[var(--app-accent-text)]" /> : child.icon || <TagIcon className="w-4 h-4 text-[var(--app-muted)]" />}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium truncate text-sm">{child.key}</span>
                                                                {child.isLearned && child.frequency && (
                                                                    <span className="text-xs bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-700/30">
                                                                        {child.frequency}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {child.description && (
                                                                <div className="text-xs text-[var(--app-muted)] truncate">{child.description}</div>
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
                                        ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent-text)] border border-[var(--app-accent-line)]'
                                        : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)] border border-transparent'
                                }`}
                                onClick={() => handleSelect(prop.key)}
                                onMouseEnter={() => setSelectedIndex(i)}
                            >
                                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-lg">
                                    {prop.isLearned ? <SparklesIcon className="w-4 h-4 text-[var(--app-accent-text)]" /> : prop.icon || <TagIcon className="w-4 h-4 text-[var(--app-muted)]" />}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium truncate text-sm">{prop.key}</span>
                                        {prop.isLearned && prop.frequency && (
                                            <span className="text-xs bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-700/30">
                                                {prop.frequency}
                                            </span>
                                        )}
                                    </div>
                                    {prop.description && (
                                        <div className="text-xs text-[var(--app-muted)] truncate">{prop.description}</div>
                                    )}
                                    {renderTypeBadge(prop.attributeDef)}
                                </div>
                            </button>
                        );
                    })}

                    {filter && (
                        <button
                            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                                selectedIndex === filtered.length ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent-text)] border border-[var(--app-accent-line)]' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)] border border-transparent'
                            }`}
                            onClick={() => handleSelect(filter)}
                            onMouseEnter={() => setSelectedIndex(filtered.length)}
                        >
                            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                <PlusIcon className="w-4 h-4 text-[var(--app-accent-text)]" />
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm text-[var(--app-accent-text)]">Create "{filter}"</div>
                                <div className="text-xs text-[var(--app-muted)] truncate">Add as new custom property</div>
                            </div>
                        </button>
                    )}

                    {filtered.length === 0 && !filter && (
                        <div className="flex flex-col items-center justify-center py-8 text-[var(--app-muted)] gap-2">
                            <SearchIcon className="w-6 h-6 opacity-30" />
                            <span className="text-xs">Type to search properties...</span>
                        </div>
                    )}
                </div>
        </Modal>
    );
}