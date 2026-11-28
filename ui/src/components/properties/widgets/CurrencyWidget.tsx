import React, {useState} from 'react';
import type {WidgetProps} from './types';
import {BaseInput, PropertyWidgetWrapper, useBasePropertyWidget} from './BasePropertyWidget';

export function CurrencyWidget({
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
    const [numValue, setNumValue] = useState(() => parseFloat(value) || 0);

    const {displayValue, handleChange: baseHandleChange, handleFocus, handleBlur, error: baseError} = useBasePropertyWidget({
        value: numValue.toString(),
        onChange: (val) => {
            const parsed = parseFloat(val);
            if (!isNaN(parsed)) {
                setNumValue(parsed);
                onChange(parsed.toString());
            } else if (val === '') {
                setNumValue(0);
                onChange('');
            }
        },
        error,
        required,
        validate,
    });

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setNumValue(val);
        onChange(val.toString());
    };

    return (
        <PropertyWidgetWrapper label={label} helperText={helperText} error={baseError} required={required}>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-neutral-400">$</span>
                    <BaseInput
                        type="number"
                        value={displayValue}
                        onChange={baseHandleChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onKeyDown={onKeyDown}
                        disabled={disabled}
                    />
                </div>
                <input
                    type="range"
                    min="0"
                    max="2000"
                    step="10"
                    value={numValue}
                    onChange={handleSliderChange}
                    className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    disabled={disabled}
                />
            </div>
        </PropertyWidgetWrapper>
    );
}