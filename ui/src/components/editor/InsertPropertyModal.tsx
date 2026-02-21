import React, {useEffect, useMemo, useState} from 'react';
import {Modal} from '../common/Modal';
import {InformationCircleIcon, TagIcon, ExclamationTriangleIcon, SparklesIcon, CodeBlockIcon} from '../common/icons';
import {ICON_MAP} from '../layout/iconMap';
import type {OntologyAttribute, OntologyNode, SuggestedAttribute} from '@notention/core';
import {findAttributeDef} from '@notention/core';
import {Input} from '../common/Input';
import {Button} from '../common/Button';
import {PropertyValueInput} from './PropertyValueInput';
import {validatePropertyAgainstOntology} from '../../utils/propertyValidation';

interface InsertPropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (key: string, operator: string, value: string, icon?: string) => void;
    initialKey?: string;
    initialOperator?: string;
    initialValue?: string;
    attributeDef?: OntologyAttribute;
    ontology?: OntologyNode[];
    isEditing?: boolean;
    onPickLocation?: () => Promise<string>;
    suggestions?: SuggestedAttribute[];
}

export function InsertPropertyModal({
    isOpen,
    onClose,
    onInsert,
    initialKey = '',
    initialOperator = 'is',
    initialValue = '',
    attributeDef,
    ontology,
    isEditing = false,
    onPickLocation,
    suggestions = []
}: InsertPropertyModalProps) {
    const [key, setKey] = useState(initialKey);
    const [operator, setOperator] = useState(initialOperator);
    const [value, setValue] = useState(initialValue);
    const [touched, setTouched] = useState(false);

    const activeDef = useMemo(() => {
        if (ontology && key) {
            const found = findAttributeDef(key, ontology);
            if (found) return found;
        }
        return attributeDef;
    }, [key, ontology, attributeDef]);

    useEffect(() => {
        if (isOpen) {
            setKey(initialKey || '');
            setOperator(initialOperator || 'is');
            setValue(initialValue || '');
            setTouched(false);
        }
    }, [isOpen, initialKey, initialOperator, initialValue]);

    const validation = useMemo(() => {
        return validatePropertyAgainstOntology(key, operator, value, activeDef);
    }, [key, operator, value, activeDef]);

    const availableOperators = useMemo(() => {
        if (activeDef) {
            return [...(activeDef.operators.real || []), ...(activeDef.operators.imaginary || [])];
        }
        return ['is', 'is not', 'greater than', 'less than', 'contains', 'between'];
    }, [activeDef]);

    const filteredSuggestions = useMemo(() => {
        if (!key || activeDef) return [];
        const lower = key.toLowerCase();
        return suggestions
            .filter(s => s.key.toLowerCase().includes(lower) && s.key.toLowerCase() !== lower)
            .slice(0, 5);
    }, [key, suggestions, activeDef]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        setTouched(true);
        if (!key.trim() || !value.trim() || !validation.isValid) return;

        onInsert(key.trim(), operator, value.trim(), activeDef?.icon);
        onClose();
    };

    const preview = key && value ? `[${key}:${operator}:${value}]` : '...';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Property" : "Insert Property"}>
            <form onSubmit={handleSubmit} className="space-y-5">

                {/* Key Field */}
                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider flex items-center gap-1">
                        {activeDef?.icon && ICON_MAP[activeDef.icon] && React.createElement(ICON_MAP[activeDef.icon], {className: "w-4 h-4 text-blue-400"})}
                        Property Key
                    </label>
                    <Input
                        type="text"
                        placeholder="e.g. status, price, deadline"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        autoFocus={!activeDef}
                        className={`w-full ${activeDef ? "border-blue-500/50 ring-1 ring-blue-500/20" : ""}`}
                        list="learned-keys"
                    />
                    <datalist id="learned-keys">
                         {suggestions.map(s => (
                             <option key={s.key} value={s.key}>{s.key} (Learned)</option>
                         ))}
                    </datalist>

                    {filteredSuggestions.length > 0 && (
                         <div className="flex flex-wrap gap-2 mt-2">
                             {filteredSuggestions.map(s => (
                                 <button
                                     key={s.key}
                                     type="button"
                                     onClick={() => setKey(s.key)}
                                     className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-purple-900/30 text-purple-300 border border-purple-800/50 hover:bg-purple-900/50 transition-colors"
                                 >
                                     <SparklesIcon className="w-3 h-3" />
                                     {s.key}
                                 </button>
                             ))}
                         </div>
                    )}

                    {activeDef && (
                        <div className="bg-blue-900/10 border border-blue-900/30 rounded p-2 mt-2 text-xs flex flex-col gap-1">
                            {activeDef.description && (
                                <div className="flex items-start gap-1.5 text-blue-300">
                                    <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/>
                                    <span>{activeDef.description}</span>
                                </div>
                            )}
                            {activeDef.aliases && activeDef.aliases.length > 0 && (
                                <div className="text-gray-500 pl-5">
                                    <span className="italic text-gray-600">Also known as: </span>
                                    {activeDef.aliases.join(', ')}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-[1fr,2fr] gap-3">
                    {/* Operator Field */}
                    <div>
                        <label className="block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider">
                            Operator
                        </label>
                        <select
                            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-gray-300 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer hover:bg-gray-800/50"
                            value={operator}
                            onChange={(e) => setOperator(e.target.value)}
                        >
                            {availableOperators.map(op => (
                                <option key={op} value={op}>{op}</option>
                            ))}
                        </select>
                    </div>

                    {/* Value Field */}
                    <div>
                        <label className="block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider">
                            Value
                        </label>
                        <PropertyValueInput
                            value={value}
                            onChange={(val) => {
                                setValue(val);
                                setTouched(true);
                            }}
                            attributeDef={activeDef}
                            onPickLocation={onPickLocation}
                        />
                    </div>
                </div>

                {/* Validation Error Message */}
                {touched && !validation.isValid && (
                    <div className="bg-red-900/20 border border-red-900/50 rounded p-2 flex items-center gap-2 text-red-300 text-xs animate-fadeIn">
                        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0"/>
                        <span>{validation.message}</span>
                    </div>
                )}

                {/* Preview */}
                <div className={`mt-2 p-3 rounded-lg border flex items-center justify-between transition-colors ${
                    validation.isValid && key && value ? 'bg-gray-900/80 border-gray-700' : 'bg-gray-900/30 border-gray-800'
                }`}>
                    <div className="flex items-center gap-2 text-gray-500">
                        <CodeBlockIcon className="w-4 h-4" />
                        <span className="text-xs uppercase font-semibold">Preview</span>
                    </div>
                    <code className={`${validation.isValid && key && value ? 'text-blue-300' : 'text-gray-600'} font-mono text-sm`}>
                        {preview}
                    </code>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="secondary"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={!key.trim() || !value.trim() || !validation.isValid}
                        variant="primary"
                        icon={TagIcon}
                    >
                        {isEditing ? "Update Property" : "Insert Property"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
