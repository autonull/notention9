import React, {useState, useEffect, useRef} from 'react';
import {Input} from '../components/ui/Primitives';
import {Button} from '../components/ui/Button';
import {useToast} from '../hooks/useToast';
import {useAnnounce} from '../hooks/useAccessibility';
import {createBaseStrategy} from '@notention/core/ui';
import {getStrategyConfig} from './strategyConfigs.js';
import type {OntologyNode} from '@notention/core';

const config = getStrategyConfig('inline-detail');
if (!config) throw new Error('Strategy config not found: inline-detail');

interface InlineDetailProps {
    ontology: OntologyNode[];
    onInsert: (key: string, operator: string, value: string, icon?: string) => void;
    onCancel: () => void;
    initialKey?: string;
    isOpen?: boolean;
}

export const InlineDetailStrategy = createBaseStrategy<InlineDetailProps>(
    config.id,
    config.seam,
    function InlineDetail({ontology, onInsert, onCancel, initialKey = '', isOpen = true}) {
        const [key, setKey] = useState(initialKey);
        const [operator, setOperator] = useState('is');
        const [value, setValue] = useState('');
        const [showSuggestions, setShowSuggestions] = useState(false);
        const inputRef = useRef<HTMLInputElement>(null);
        const {addToast} = useToast();
        const announce = useAnnounce();

        const ALL_OPERATORS = [
            {value: 'is', label: 'is (=)'},
            {value: 'is not', label: 'is not (!=)'},
            {value: 'greater than', label: 'greater than (>)'},
            {value: 'less than', label: 'less than (<)'},
            {value: 'contains', label: 'contains'},
        ];

        useEffect(() => {
            if (isOpen && inputRef.current) {
                inputRef.current.focus();
            }
        }, [isOpen]);

        useEffect(() => {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onCancel();
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }, [onCancel]);

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!key.trim() || !value.trim()) {
                addToast('Key and value are required', 'error');
                return;
            }
            onInsert(key, operator, value);
            announce(`Property added: ${key} ${operator} ${value}`);
            setKey('');
            setValue('');
        };

        const filteredOntology = ontology
            .flatMap(node => node.attributes ?? [])
            .filter(attr => attr.key.toLowerCase().includes(key.toLowerCase()))
            .slice(0, 5);

        return (
            <form onSubmit={handleSubmit} className="inline-detail" data-testid="inline-detail">
                <div className="inline-detail__row">
                    <label htmlFor="inline-key" className="sr-only">Property key</label>
                    <Input
                        ref={inputRef}
                        id="inline-key"
                        type="text"
                        value={key}
                        onChange={e => setKey(e.target.value)}
                        placeholder="Property key (e.g., framework)"
                        aria-autocomplete="list"
                        aria-controls="inline-suggestions"
                        aria-expanded={showSuggestions && filteredOntology.length > 0}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        data-testid="inline-key-input"
                    />
                    <Select
                        value={operator}
                        onChange={e => setOperator(e.target.value)}
                        options={ALL_OPERATORS}
                        className="inline-detail__operator"
                        data-testid="inline-operator-select"
                    />
                    <Input
                        type="text"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder="Value"
                        data-testid="inline-value-input"
                    />
                    <Button type="submit" variant="primary" size="sm">
                        Add
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
                {showSuggestions && filteredOntology.length > 0 && (
                    <ul id="inline-suggestions" className="inline-detail__suggestions" role="listbox">
                        {filteredOntology.map(attr => (
                            <li key={attr.key} role="option" onClick={() => {
                                setKey(attr.key);
                                setShowSuggestions(false);
                            }}>
                                {attr.key} ({attr.type})
                            </li>
                        ))}
                    </ul>
                )}
            </form>
        );
    },
    config.version,
    config.defaultProps
);