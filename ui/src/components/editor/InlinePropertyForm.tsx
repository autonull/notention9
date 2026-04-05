import React, {useEffect, useMemo, useRef, useState} from 'react';
import {NodeViewWrapper} from '@tiptap/react';
import {ICON_MAP} from '../layout/iconMap';
import {TagIcon} from '../common/icons';
import {useSettings} from '../../hooks/useSettingsContext';
import {useOntologyIndex} from '../../hooks/index';
import {getCanonicalKey, OntologyAttribute} from '@notention/core';
import {validatePropertyAgainstOntology} from '../../utils/propertyValidation';
import {useEditorActions} from '../../hooks/index';
import {MapIcon} from '../common/icons';

interface InlinePropertyFormProps {
    initialKey: string;
    initialOperator: string;
    initialValue: string;
    onUpdate: (key: string, operator: string, value: string, isValid: boolean) => void;
    onCancel: () => void;
    editor: any; // Using any for brevity here, replace with Editor type if available easily from props
    getPos: () => number;
}

export function InlinePropertyForm({
                                       initialKey,
                                       initialOperator,
                                       initialValue,
                                       onUpdate,
                                       onCancel,
                                       editor,
                                       getPos
                                   }: InlinePropertyFormProps) {
    const [key, setKey] = useState(initialKey || '');
    const [operator, setOperator] = useState(initialOperator || 'is');
    const [value, setValue] = useState(initialValue || '');

    // Focus management to sequence through key -> operator -> value
    const [focusedField, setFocusedField] = useState<'key' | 'operator' | 'value'>('key');

    const keyInputRef = useRef<HTMLInputElement>(null);
    const operatorSelectRef = useRef<HTMLSelectElement>(null);
    const valueInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLSpanElement>(null);

    const {settings} = useSettings();
    const {propertyTypes} = useOntologyIndex(settings.ontology);
    const {onPickLocation, suggestions = []} = useEditorActions();

    const canonicalKey = useMemo(() => {
        return getCanonicalKey(key, settings.ontology);
    }, [key, settings.ontology]);

    const activeDef = propertyTypes.get(canonicalKey);

    const availableOperators = useMemo(() => {
        if (activeDef) {
            return [...(activeDef.operators.real || []), ...(activeDef.operators.imaginary || [])];
        }
        return ['is', 'is not', 'greater than', 'less than', 'contains', 'between', '=', '!=', '>', '<', '>=', '<='];
    }, [activeDef]);

    // Ensure current operator is valid for the definition
    useEffect(() => {
        if (activeDef && !availableOperators.includes(operator) && availableOperators.length > 0) {
            setOperator(availableOperators[0]);
        }
    }, [activeDef, availableOperators, operator]);

    const validation = useMemo(() => {
        return validatePropertyAgainstOntology(key, operator, value, activeDef);
    }, [key, operator, value, activeDef]);

    // Handle focus changes dynamically
    useEffect(() => {
        if (focusedField === 'key') {
            keyInputRef.current?.focus();
        } else if (focusedField === 'operator') {
            operatorSelectRef.current?.focus();
        } else if (focusedField === 'value') {
            valueInputRef.current?.focus();
        }
    }, [focusedField]);

    // Auto-focus when mounted
    useEffect(() => {
        if (!initialKey) {
            setFocusedField('key');
        } else if (!initialValue) {
            setFocusedField('value');
        } else {
            setFocusedField('key');
        }
    }, []);

    const submit = () => {
        // Prevent empty submits unless they want to cancel
        if (!key.trim()) {
            onCancel();
            return;
        }
        onUpdate(key.trim(), operator, value.trim(), validation.isValid);
    };

    const handleKeyDown = (e: React.KeyboardEvent, field: 'key' | 'operator' | 'value') => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (field === 'key') {
                setFocusedField('operator');
            } else if (field === 'operator') {
                setFocusedField('value');
            } else if (field === 'value') {
                submit();
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            if (!e.shiftKey) {
                if (field === 'key') setFocusedField('operator');
                else if (field === 'operator') setFocusedField('value');
                else submit();
            } else {
                if (field === 'value') setFocusedField('operator');
                else if (field === 'operator') setFocusedField('key');
                else submit();
            }
        } else if (e.key === 'Backspace') {
            if (field === 'value' && value === '') {
                e.preventDefault();
                setFocusedField('operator');
            } else if (field === 'operator') {
                e.preventDefault();
                setFocusedField('key');
            } else if (field === 'key' && key === '') {
                e.preventDefault();
                onCancel();
            }
        } else if (e.key === ':' && field === 'key') {
            e.preventDefault();
            setFocusedField('operator');
        } else if (e.key === ']' && field === 'value') {
            e.preventDefault();
            submit();
        }
    };

    // Prevent typing of property syntax brackets
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'key' | 'value') => {
        const val = e.target.value.replace(/[\[\]:]/g, ''); // strip syntax chars
        if (field === 'key') setKey(val);
        else if (field === 'value') setValue(val);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                submit(); // Treat clicking outside as "save"
            }
        };

        // Wait a frame so we don't catch the click that opened it
        const timerId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timerId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [key, operator, value, validation.isValid]); // Re-bind when values change so submit gets latest state

    const effectiveIcon = activeDef?.icon;
    const IconComponent = effectiveIcon && ICON_MAP[effectiveIcon] ? ICON_MAP[effectiveIcon] : TagIcon;

    // Convert property types map to list for datalist suggestions
    const suggestionKeys = useMemo(() => {
        const keys = new Set(propertyTypes.keys());
        suggestions.forEach(s => keys.add(s.key));
        return Array.from(keys);
    }, [propertyTypes, suggestions]);

    return (
        <span
            ref={containerRef}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 border rounded-md select-none bg-blue-900/50 border-blue-500/50 text-sm ring-2 ring-blue-500 ring-opacity-50"
        >
            <IconComponent className="w-3.5 h-3.5 text-blue-400" />

            <span className="flex items-center gap-1">
                {/* Key Input */}
                <input
                    ref={keyInputRef}
                    type="text"
                    value={key}
                    onChange={(e) => handleInputChange(e, 'key')}
                    onKeyDown={(e) => handleKeyDown(e, 'key')}
                    onFocus={() => setFocusedField('key')}
                    placeholder="key"
                    className="bg-transparent border-none outline-none text-blue-300 font-semibold p-0 focus:ring-0"
                    style={{ width: `calc(${Math.max(3, key.length)}ch + 12px)`, minWidth: '40px' }}
                    list="property-keys-list"
                />
                <datalist id="property-keys-list">
                    {suggestionKeys.map(k => (
                        <option key={k} value={k} />
                    ))}
                </datalist>

                {/* Operator Select */}
                <select
                    ref={operatorSelectRef}
                    value={operator}
                    onChange={(e) => {
                        setOperator(e.target.value);
                        setFocusedField('value'); // Move focus to value after select
                    }}
                    onKeyDown={(e) => handleKeyDown(e, 'operator')}
                    onFocus={() => setFocusedField('operator')}
                    className="bg-transparent border-none outline-none text-blue-500 text-xs uppercase font-bold p-0 cursor-pointer appearance-none"
                >
                    {availableOperators.map(op => (
                        <option key={op} value={op} className="bg-gray-800 text-white normal-case">{op}</option>
                    ))}
                </select>

                {/* Value Input Container */}
                <span className="flex items-center relative">
                    {activeDef?.type === 'enum' && activeDef.options ? (
                        <select
                            ref={valueInputRef as unknown as React.RefObject<HTMLSelectElement>}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'value')}
                            onFocus={() => setFocusedField('value')}
                            className="bg-blue-900/50 text-blue-200 font-mono px-1 rounded border-none outline-none p-0 focus:ring-1 focus:ring-blue-400 min-w-[40px] appearance-none cursor-pointer"
                        >
                            <option value="" disabled>Select {key}...</option>
                            {activeDef.options.map(opt => (
                                <option key={opt} value={opt} className="bg-gray-800 text-white font-sans">{opt}</option>
                            ))}
                        </select>
                    ) : activeDef?.type === 'date' ? (
                        <input
                            ref={valueInputRef}
                            type="date"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'value')}
                            onFocus={() => setFocusedField('value')}
                            className="bg-blue-900/50 text-blue-200 font-mono px-1 rounded border-none outline-none p-0 focus:ring-1 focus:ring-blue-400 min-w-[40px]"
                        />
                    ) : activeDef?.type === 'datetime' ? (
                        <input
                            ref={valueInputRef}
                            type="datetime-local"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'value')}
                            onFocus={() => setFocusedField('value')}
                            className="bg-blue-900/50 text-blue-200 font-mono px-1 rounded border-none outline-none p-0 focus:ring-1 focus:ring-blue-400 min-w-[40px]"
                        />
                    ) : activeDef?.type === 'boolean' ? (
                        <select
                            ref={valueInputRef as unknown as React.RefObject<HTMLSelectElement>}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'value')}
                            onFocus={() => setFocusedField('value')}
                            className="bg-blue-900/50 text-blue-200 font-mono px-1 rounded border-none outline-none p-0 focus:ring-1 focus:ring-blue-400 min-w-[40px] appearance-none cursor-pointer"
                        >
                            <option value="" disabled>Select...</option>
                            <option value="true" className="bg-gray-800 text-white font-sans">true</option>
                            <option value="false" className="bg-gray-800 text-white font-sans">false</option>
                        </select>
                    ) : (activeDef?.type === 'number' || activeDef?.type === 'quantity') ? (
                        <span className="flex items-center">
                            <input
                                ref={valueInputRef}
                                type="text" // Using text to allow units like "10kg"
                                value={value}
                                onChange={(e) => handleInputChange(e, 'value')}
                                onKeyDown={(e) => handleKeyDown(e, 'value')}
                                onFocus={() => setFocusedField('value')}
                                placeholder="0 unit"
                                className="bg-blue-900/50 text-blue-200 font-mono px-1 rounded border-none outline-none p-0 focus:ring-1 focus:ring-blue-400"
                                style={{ width: `calc(${Math.max(5, value.length)}ch + 8px)`, minWidth: '40px' }}
                            />
                        </span>
                    ) : (
                        <input
                            ref={valueInputRef}
                            type="text"
                            value={value}
                            onChange={(e) => handleInputChange(e, 'value')}
                            onKeyDown={(e) => handleKeyDown(e, 'value')}
                            onFocus={() => setFocusedField('value')}
                            placeholder="value"
                            className="bg-blue-900/50 text-blue-200 font-mono px-1 rounded border-none outline-none p-0 focus:ring-1 focus:ring-blue-400"
                            style={{ width: `calc(${Math.max(5, value.length)}ch + 8px)`, minWidth: '40px' }}
                        />
                    )}

                    {onPickLocation && activeDef?.type === 'geo' && (
                        <button
                            type="button"
                            onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const result = onPickLocation();
                                if (result instanceof Promise) {
                                    const loc = await result;
                                    if (loc) {
                                        setValue(loc);
                                        setFocusedField('value');
                                    }
                                }
                            }}
                            className="ml-1 text-blue-400 hover:text-blue-300 transition-colors focus:outline-none"
                            title="Pick from Map"
                        >
                            <MapIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </span>
            </span>
        </span>
    );
}
