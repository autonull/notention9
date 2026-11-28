import React, {useState} from 'react';
import type {WidgetProps} from './types';
import {BaseInput, PropertyWidgetWrapper, useBasePropertyWidget} from './BasePropertyWidget';

export function LocationWidget({
    value,
    onChange,
    onKeyDown,
    error,
    required,
    label,
    helperText,
    validate,
    disabled,
}: WidgetProps & {error?: string; required?: boolean; label?: string; helperText?: string; validate?: (value: string) => string | undefined; disabled?: boolean}) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const {displayValue, handleChange, handleFocus, handleBlur} = useBasePropertyWidget({
        value,
        onChange,
        error,
        required,
        validate,
    });

    const handleInputChange = (val: string) => {
        handleChange(val);

        if (val.length > 2) {
            // Mock geocoding for UI demo
            // Real implementation would hit Nominatim
            if (val.toLowerCase().includes('aus')) {
                setSuggestions(['Austin, TX', 'Austin, MN', 'Australia']);
            } else {
                setSuggestions([]);
            }
        } else {
            setSuggestions([]);
        }
    };

    return (
        <PropertyWidgetWrapper label={label} helperText={helperText} error={error} required={required}>
            <div className="relative">
                <BaseInput
                    type="text"
                    value={displayValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={onKeyDown}
                    placeholder="City, Region..."
                    disabled={disabled}
                />
                {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded shadow-xl z-20">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white"
                                onClick={() => {
                                    handleChange(s);
                                    setSuggestions([]);
                                }}
                            >
                                📍 {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </PropertyWidgetWrapper>
    );
}