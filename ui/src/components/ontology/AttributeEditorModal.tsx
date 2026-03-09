import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { OntologyAttribute } from '@notention/core';
import { CodeBlockIcon } from '../common/icons';

interface AttributeEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (key: string, attribute: OntologyAttribute) => void;
    initialValues?: {
        key: string;
        type: string;
        description?: string;
        aliases?: string[];
    };
    title?: string;
}

const ATTRIBUTE_TYPES = ['string', 'number', 'date', 'datetime', 'geo', 'enum', 'relationship'];

export function AttributeEditorModal({
    isOpen,
    onClose,
    onConfirm,
    initialValues,
    title = 'Add Attribute'
}: AttributeEditorModalProps) {
    const [key, setKey] = useState('');
    const [type, setType] = useState('string');
    const [description, setDescription] = useState('');
    const [aliases, setAliases] = useState('');

    useEffect(() => {
        if (isOpen && initialValues) {
            setKey(initialValues.key || '');
            setType(initialValues.type || 'string');
            setDescription(initialValues.description || '');
            setAliases(initialValues.aliases ? initialValues.aliases.join(', ') : '');
        } else if (isOpen) {
            setKey('');
            setType('string');
            setDescription('');
            setAliases('');
        }
    }, [isOpen, initialValues]);

    const generatedAttribute = useMemo(() => {
        // Auto-generate operators based on type (simple heuristic for now)
        let operators = { real: ['is'], imaginary: ['is'] };
        switch (type) {
            case 'number':
                operators = { real: ['is', '<', '>', 'between'], imaginary: ['is', 'between', '<', '>'] };
                break;
            case 'date':
            case 'datetime':
                operators = { real: ['is', 'before', 'after'], imaginary: ['is', 'before', 'after'] };
                break;
            case 'geo':
                operators = { real: ['is', 'near'], imaginary: ['is', 'near'] };
                break;
            case 'string':
            default:
                operators = { real: ['is', 'contains'], imaginary: ['is', 'contains'] };
                break;
        }

        return {
            type,
            description,
            operators,
            aliases: aliases.split(',').map(s => s.trim()).filter(Boolean)
        };
    }, [type, description, aliases]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!key.trim()) return;

        onConfirm(key, generatedAttribute);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                    <div>
                        <Input
                            label="Attribute Key"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="e.g., price, location"
                            autoFocus
                            required
                            className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">Unique identifier for this property (camelCase recommended).</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Data Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            {ATTRIBUTE_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What does this attribute represent?"
                            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] transition-colors"
                        />
                    </div>

                    <div>
                        <Input
                            label="Aliases (Comma Separated)"
                            value={aliases}
                            onChange={(e) => setAliases(e.target.value)}
                            placeholder="e.g., cost, amount, fee"
                            className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">Alternative names used for matching.</p>
                    </div>

                    {/* JSON Preview */}
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                             <CodeBlockIcon className="w-4 h-4" />
                             <span className="text-xs font-semibold uppercase tracking-wider">Preview</span>
                        </div>
                        <div className="bg-gray-900 rounded-md p-3 border border-gray-800 overflow-x-auto">
                            <pre className="text-[10px] font-mono text-blue-300 leading-relaxed">
{JSON.stringify({ [key || 'key']: generatedAttribute }, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 mt-auto">
                    <Button
                        onClick={onClose}
                        variant="secondary"
                        type="button"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={!key.trim()}
                    >
                        Save Attribute
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
