import React from 'react';
import type {TextWidgetProps} from './types';
import {BaseInput, PropertyWidgetWrapper, useBasePropertyWidget} from './BasePropertyWidget';

export function TextWidget({
    value,
    onChange,
    onKeyDown,
    placeholder,
    error,
    required,
    label,
    helperText,
    validate,
    disabled,
}: TextWidgetProps & {error?: string; required?: boolean; label?: string; helperText?: string; validate?: (value: string) => string | undefined; disabled?: boolean}) {
    const {displayValue, handleChange, handleFocus, handleBlur} = useBasePropertyWidget({
        value,
        onChange,
        error,
        required,
        validate,
    });

    return (
        <PropertyWidgetWrapper label={label} helperText={helperText} error={error} required={required}>
            <BaseInput
                type="text"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={onKeyDown}
                placeholder={placeholder || "Value..."}
                disabled={disabled}
            />
        </PropertyWidgetWrapper>
    );
}