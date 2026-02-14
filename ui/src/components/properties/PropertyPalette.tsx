import React, {useEffect, useMemo, useRef, useState} from 'react';
import {OntologyNode, SuggestedAttribute} from '@notention/core';
import {SearchIcon, SparklesIcon, PlusIcon, TagIcon} from '../common/icons';
import {Input} from '../common/Input';

interface PropertyPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (key: string) => void;
    ontology: OntologyNode[];
    suggestions?: SuggestedAttribute[];
}

interface PropertyOption {
    key: string;
    icon?: string;
    description?: string;
    isLearned?: boolean;
    frequency?: number;
}

export const PropertyPalette: React.FC<PropertyPaletteProps> = ({
    isOpen,
    onClose,
    onInsert,
    ontology,
    suggestions = []
}) => {
    const [filter, setFilter] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFilter('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const propertyOptions = useMemo(() => {
        const defaults = [
            {key: 'role', icon: '💼', description: 'Add a role or skill'},
            {key: 'rate', icon: '💰', description: 'Hourly or daily rate'},
            {key: 'location', icon: '📍', description: 'Geographic location'},
            {key: 'deadline', icon: '📅', description: 'Due date or time'},
            {key: 'skill', icon: '⚡', description: 'Technical skill'}
        ];

        const options: PropertyOption[] = [...defaults];
        const existingKeys = new Set(defaults.map(d => d.key));

        // Add learned suggestions
        suggestions.forEach(s => {
            if (!existingKeys.has(s.key)) {
                options.push({
                    key: s.key,
                    description: `Learned`,
                    isLearned: true,
                    frequency: s.frequency
                });
                existingKeys.add(s.key);
            }
        });

        ontology.forEach(node => {
            if (!node.attributes) return;
            Object.entries(node.attributes).forEach(([key, attr]) => {
                if (!existingKeys.has(key)) {
                    options.push({
                        key,
                        icon: attr.icon,
                        description: attr.description || node.label
                    });
                    existingKeys.add(key);
                }
            });
        });
        return options;
    }, [ontology, suggestions]);

    const filtered = useMemo(() => {
        if (!filter) return propertyOptions;
        const lowerFilter = filter.toLowerCase();
        return propertyOptions.filter(p =>
            p.key.toLowerCase().includes(lowerFilter) ||
            p.description?.toLowerCase().includes(lowerFilter)
        );
    }, [filter, propertyOptions]);

    const handleSelect = (key: string) => {
        onInsert(key);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const totalItems = filtered.length + (filter ? 1 : 0);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % totalItems);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filter && selectedIndex === filtered.length) {
                handleSelect(filter);
            } else if (filtered[selectedIndex]) {
                handleSelect(filtered[selectedIndex].key);
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[20vh] bg-transparent" onClick={onClose}>
            <div
                className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-80 overflow-hidden flex flex-col transform transition-all animate-fade-in-up"
                onClick={e => e.stopPropagation()}
                style={{maxHeight: '400px'}}
            >
                <div className="p-3 border-b border-gray-700 bg-gray-800/95 backdrop-blur">
                    <Input
                        ref={inputRef}
                        type="text"
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search properties..."
                        icon={SearchIcon}
                        className="w-full text-sm"
                        autoFocus
                    />
                </div>

                <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                    {filtered.map((prop, i) => (
                        <button
                            key={prop.key}
                            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${i === selectedIndex ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30' : 'text-gray-300 hover:bg-gray-700/50 border border-transparent'}`}
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
                            </div>
                        </button>
                    ))}

                    {filter && (
                        <button
                            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${selectedIndex === filtered.length ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30' : 'text-gray-300 hover:bg-gray-700/50 border border-transparent'}`}
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
                            <span className="text-xs">Type to search...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
