import React from 'react';
import type {EnumWidgetProps} from './types';
import {BaseSelect, PropertyWidgetWrapper, useBasePropertyWidget} from './BasePropertyWidget';

export function EnumWidget({
    value,
    onChange,
    options = [],
    error,
    required,
    label,
    helperText,
    validate,
    disabled,
}: EnumWidgetProps & {error?: string; required?: boolean; label?: string; helperText?: string; validate?: (value: string) => string | undefined; disabled?: boolean}) {
    const {displayValue, handleChange, handleFocus, handleBlur} = useBasePropertyWidget({
        value,
        onChange,
        error,
        required,
        validate,
    });

    return (
        <PropertyWidgetWrapper label={label} helperText={helperText} error={error} required={required}>
            <BaseSelect
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={disabled}
            >
                <option value="" disabled>Select...</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </BaseSelect>
        </PropertyWidgetWrapper>
    );
}