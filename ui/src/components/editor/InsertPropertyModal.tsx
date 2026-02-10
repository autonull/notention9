import React, {useEffect, useMemo, useState} from 'react';
import {Modal} from '../common/Modal';
import {InformationCircleIcon, TagIcon} from '../common/icons';
import {ICON_MAP} from '../layout/iconMap';
import type {OntologyAttribute, OntologyNode} from '@notention/core';
import {findAttributeDef} from '@notention/core';
import {Input} from '../common/Input';
import {Button} from '../common/Button';
import {PropertyValueInput} from './PropertyValueInput';

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

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setKey(initialKey || '');
            setOperator(initialOperator || 'is');
            setValue(initialValue || '');
        }
    }, [isOpen, initialKey, initialOperator, initialValue, attributeDef]);

    const activeDef = useMemo(() => {
        if (ontology && key) {
            const found = findAttributeDef(key, ontology);
            if (found) return found;
        }
        return attributeDef;
    }, [key, ontology, attributeDef]);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!key.trim() || !value.trim()) return;
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

                <div>
                    <label
                        className="block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider flex items-center gap-1">
                        {activeDef?.icon && ICON_MAP[activeDef.icon] && React.createElement(ICON_MAP[activeDef.icon], {className: "w-4 h-4 text-blue-400"})}
                        Key
                    </label>
                    <Input
                        type="text"
                        placeholder="e.g. status, price, deadline"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        // Auto focus only if no attribute def (meaning we typed custom key or it's generic open)
                        autoFocus={!activeDef}
                    />
                    {activeDef?.description && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                            <InformationCircleIcon className="w-3 h-3"/>
                            {activeDef.description}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider">
                        Operator
                    </label>
                    <select
                        className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-gray-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                    >
                        <option value="is">is (=)</option>
                        <option value="is not">is not (!=)</option>
                        <option value="greater than">greater than (&gt;)</option>
                        <option value="less than">less than (&lt;)</option>
                        <option value="contains">contains</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider">
                        Value
                    </label>
                    <PropertyValueInput
                        value={value}
                        onChange={setValue}
                        attributeDef={activeDef}
                        onPickLocation={onPickLocation}
                    />
                </div>

                <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase">Preview</span>
                    <code className="text-blue-400 font-mono text-sm">{preview}</code>
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
                        disabled={!key.trim() || !value.trim()}
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
