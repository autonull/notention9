import React, {useEffect, useMemo, useState} from 'react';
import {Modal} from '../common/Modal';
import {InformationCircleIcon, TagIcon, ExclamationTriangleIcon} from '../common/icons';
import {ICON_MAP} from '../layout/iconMap';
import type {OntologyAttribute, OntologyNode} from '@notention/core';
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
                                        onPickLocation
                                    }: InsertPropertyModalProps) {
    const [key, setKey] = useState(initialKey);
    const [operator, setOperator] = useState(initialOperator);
    const [value, setValue] = useState(initialValue);
    const [touched, setTouched] = useState(false);

    // Find attribute definition dynamically if key changes
    const activeDef = useMemo(() => {
        if (ontology && key) {
            // First try direct lookup if ontology is flat or we have a helper
            // findAttributeDef recursively searches the tree
            const found = findAttributeDef(key, ontology);
            if (found) return found;
        }
        return attributeDef;
    }, [key, ontology, attributeDef]);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setKey(initialKey || '');
            setOperator(initialOperator || 'is');
            setValue(initialValue || '');
            setTouched(false);
        }
    }, [isOpen, initialKey, initialOperator, initialValue]);

    // Validate in real-time
    const validation = useMemo(() => {
        return validatePropertyAgainstOntology(key, operator, value, activeDef);
    }, [key, operator, value, activeDef]);

    // Derived operators list
    const availableOperators = useMemo(() => {
        if (activeDef) {
            return [...(activeDef.operators.real || []), ...(activeDef.operators.imaginary || [])];
        }
        // Default set if unknown
        return ['is', 'is not', 'greater than', 'less than', 'contains', 'between'];
    }, [activeDef]);

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
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-400">
                    Properties make your note machine-readable and searchable.
                </p>

                {/* Key Field */}
                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider flex items-center gap-1">
                        {activeDef?.icon && ICON_MAP[activeDef.icon] && React.createElement(ICON_MAP[activeDef.icon], {className: "w-4 h-4 text-blue-400"})}
                        Key
                    </label>
                    <Input
                        type="text"
                        placeholder="e.g. status, price, deadline"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        autoFocus={!activeDef}
                        className={activeDef ? "border-blue-500/50" : ""}
                    />
                    {activeDef?.description && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                            <InformationCircleIcon className="w-3 h-3"/>
                            {activeDef.description}
                        </div>
                    )}
                </div>

                {/* Operator Field */}
                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider">
                        Operator
                    </label>
                    <select
                        className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-gray-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
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

                    {/* Validation Error Message */}
                    {touched && !validation.isValid && (
                        <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs animate-fadeIn">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5"/>
                            <span>{validation.message}</span>
                        </div>
                    )}
                </div>

                {/* Preview */}
                <div className={`p-3 rounded border flex items-center justify-between transition-colors ${
                    validation.isValid ? 'bg-gray-900/50 border-gray-700/50' : 'bg-red-900/20 border-red-900/50'
                }`}>
                    <span className="text-xs text-gray-500 uppercase">Preview</span>
                    <code className={`${validation.isValid ? 'text-blue-400' : 'text-red-400'} font-mono text-sm`}>
                        {preview}
                    </code>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="ghost"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={!key.trim() || !value.trim() || !validation.isValid}
                        variant="primary"
                        icon={TagIcon}
                    >
                        {isEditing ? "Update" : "Insert"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
