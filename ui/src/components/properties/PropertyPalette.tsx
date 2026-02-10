import React, {useEffect, useMemo, useRef, useState} from 'react';
import {OntologyNode} from '@notention/core';

interface PropertyPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (key: string) => void;
    ontology: OntologyNode[];
}

interface PropertyOption {
    key: string;
    icon?: string;
    description?: string;
}

export const PropertyPalette: React.FC<PropertyPaletteProps> = ({
                                                                    isOpen,
                                                                    onClose,
                                                                    onInsert,
                                                                    ontology
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

    // Flatten ontology attributes into selectable options
    // We want leaf attributes from ontology nodes
    // Memoize options generation
    const propertyOptions = useMemo(() => {
        const defaults = [
            {key: 'role', icon: '💼', description: 'Add a role or skill'},
            {key: 'rate', icon: '💰', description: 'Hourly or daily rate'},
            {key: 'location', icon: '📍', description: 'Geographic location'},
            {key: 'deadline', icon: '📅', description: 'Due date or time'},
            {key: 'skill', icon: '⚡', description: 'Technical skill'}
        ];

        const options = [...defaults];
        const existingKeys = new Set(defaults.map(d => d.key));

        ontology.forEach(node => {
            if (!node.attributes) return;
            Object.entries(node.attributes).forEach(([key, attr]) => {
                if (!existingKeys.has(key)) {
                    options.push({
                        key,
                        icon: attr.icon || '🏷️',
                        description: attr.description || node.label
                    });
                    existingKeys.add(key);
                }
            });
        });
        return options;
    }, [ontology]);

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
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % (filtered.length + (filter ? 1 : 0)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(
                (prev) => (prev - 1 + (filtered.length + (filter ? 1 : 0))) % (filtered.length + (filter ? 1 : 0))
            );
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const totalItems = filtered.length + (filter ? 1 : 0);

            // If Custom Property is selected (last item if filter exists)
            if (filter && selectedIndex === filtered.length) {
                handleSelect(filter); // Insert custom key
            } else if (filtered[selectedIndex]) {
                handleSelect(filtered[selectedIndex].key);
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[20vh] bg-transparent"
             onClick={onClose}>
            <div
                className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-80 overflow-hidden flex flex-col transform transition-all animate-fade-in-up"
                onClick={e => e.stopPropagation()}
                style={{maxHeight: '400px'}}
            >
                <div className="p-2 border-b border-gray-700 bg-gray-800">
                    <input
                        ref={inputRef}
                        type="text"
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Property name..."
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="overflow-y-auto flex-1 p-1">
                    {filtered.map((prop, i) => (
                        <button
                            key={prop.key}
                            className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 transition-colors ${i === selectedIndex ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-gray-700'}`}
                            onClick={() => handleSelect(prop.key)}
                            onMouseEnter={() => setSelectedIndex(i)}
                        >
                            <span className="text-lg">{prop.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm">{prop.key}</div>
                                {prop.description && (
                                    <div className="text-xs text-gray-500 truncate">{prop.description}</div>
                                )}
                            </div>
                        </button>
                    ))}

                    {filter && (
                        <button
                            className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 transition-colors ${selectedIndex === filtered.length ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-gray-700'}`}
                            onClick={() => handleSelect(filter)}
                            onMouseEnter={() => setSelectedIndex(filtered.length)}
                        >
                            <span className="text-lg">➕</span>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm">Create "{filter}"</div>
                                <div className="text-xs text-gray-500 truncate">Add new property</div>
                            </div>
                        </button>
                    )}

                    {filtered.length === 0 && !filter && (
                        <div className="p-4 text-center text-gray-500 text-xs">
                            Type to search properties
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
