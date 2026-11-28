import React from 'react';
import type {DateWidgetProps} from './types';
import {BaseInput, PropertyWidgetWrapper, useBasePropertyWidget} from './BasePropertyWidget';

export function DateWidget({
    value,
    onChange,
    type = 'date',
    error,
    required,
    label,
    helperText,
    validate,
    disabled,
}: DateWidgetProps & {error?: string; required?: boolean; label?: string; helperText?: string; validate?: (value: string) => string | undefined; disabled?: boolean}) {
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
                type={type === 'datetime' ? 'datetime-local' : 'date'}
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={disabled}
            />
        </PropertyWidgetWrapper>
    );
}