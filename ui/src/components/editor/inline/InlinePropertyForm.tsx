import React, {forwardRef, useEffect, useImperativeHandle, useState} from 'react';
import {SuggestionItem} from '../SuggestionList';
import type {OntologyAttribute} from '@notention/core';

interface InlinePropertyFormProps {
    propertyKey: string;
    attributeDef?: OntologyAttribute;
    onSubmit: (key: string, operator: string, value: string, icon?: string) => void;
    onCancel: () => void;
}

export const InlinePropertyForm = forwardRef((props: InlinePropertyFormProps, ref) => {
    const {propertyKey, attributeDef, onSubmit, onCancel} = props;

    // Derived states based on OntologyAttribute
    const type = attributeDef?.type || 'string';
    const isConstraint = type === 'number' || type === 'date';

    // Form state
    const [operator, setOperator] = useState('is');
    const [value, setValue] = useState('');

    // Default operator based on type
    useEffect(() => {
        if (isConstraint) setOperator('>');
        else setOperator('is');
    }, [isConstraint]);

    const submit = () => {
        if (!value.trim()) return;
        const icon = attributeDef?.icon;
        onSubmit(propertyKey, operator, value, icon);
    };

    useImperativeHandle(ref, () => ({
        onKeyDown: ({event}: { event: KeyboardEvent }) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submit();
                return true;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
                return true;
            }
            // Let the user type normally in the input fields
            return false;
        },
    }));

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[300px] z-50 p-3 flex flex-col gap-3" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
            <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">{propertyKey}</div>

            <div className="flex gap-2">
                {isConstraint ? (
                    <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 flex-shrink-0"
                        autoFocus={false}
                    >
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value=">=">&gt;=</option>
                        <option value="<=">&lt;=</option>
                        <option value="==">==</option>
                        <option value="!=">!=</option>
                    </select>
                ) : (
                    <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 flex-shrink-0"
                        autoFocus={false}
                    >
                        <option value="is">is</option>
                        <option value="not">not</option>
                        <option value="contains">has</option>
                    </select>
                )}

                {type === 'enum' && attributeDef?.options ? (
                    <select
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="flex-grow bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                        autoFocus
                    >
                        <option value="" disabled>Select {propertyKey}...</option>
                        {attributeDef.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : type === 'date' ? (
                     <input
                        type="date"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="flex-grow bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                        autoFocus
                    />
                ) : type === 'number' ? (
                     <input
                        type="number"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Value..."
                        className="flex-grow bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                        autoFocus
                    />
                ) : (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Value..."
                        className="flex-grow bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                        autoFocus
                    />
                )}
            </div>

            <div className="flex justify-end gap-2 text-xs text-gray-400 mt-1">
                <span><kbd className="bg-gray-700 px-1 rounded">Enter</kbd> to insert</span>
                <span><kbd className="bg-gray-700 px-1 rounded">Esc</kbd> to cancel</span>
            </div>
        </div>
    );
});

InlinePropertyForm.displayName = 'InlinePropertyForm';
