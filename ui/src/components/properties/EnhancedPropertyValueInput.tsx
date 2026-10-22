import React from 'react';
import type {OntologyAttribute} from '@notention/core';
import {Input} from '../common/Input';
import {Button} from '../common/Button';
import {MapIcon, ToggleLeftIcon, ToggleRightIcon, MinusIcon, PlusIcon} from '../common/icons';
import {buildWidgetMetadata} from '@notention/core';

interface PropertyValueInputProps {
    value: string;
    onChange: (value: string) => void;
    attributeDef?: OntologyAttribute;
    operator?: string;
    onPickLocation?: () => Promise<string> | void;
    onPickTime?: () => void;
    readonly?: boolean;
    numericOptions?: {
        unit?: string;
        precision?: number;
        min?: number;
        max?: number;
    };
    selectOptions?: string[];
    affinityOptions?: {
        bipolar?: boolean;
        targetType?: 'tag' | 'ontology_class' | 'peer';
    };
    arity?: {min: number; max: number};
}

function parseNumericValue(value: string): number {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

function formatNumber(num: number, precision: number): string {
    return num.toFixed(precision);
}

function clampNumber(num: number, min?: number, max?: number): number {
    let result = num;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
}

export function PropertyValueInput({
    value,
    onChange,
    attributeDef,
    operator,
    onPickLocation,
    onPickTime,
    readonly = false,
    numericOptions,
    selectOptions,
    affinityOptions,
    arity,
}: PropertyValueInputProps) {
    const widgetType = attributeDef ? buildWidgetMetadata(attributeDef).type : 'text-input';
    const attrType = attributeDef?.type;

    const handleChange = (newValue: string) => {
        if (!readonly) {
            onChange(newValue);
        }
    };

    const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (readonly) return;
        const num = parseFloat(e.target.value) || 0;
        const clamped = clampNumber(num, numericOptions?.min, numericOptions?.max);
        onChange(formatNumber(clamped, numericOptions?.precision ?? 0));
    };

    const handleNumericSlider = (newValue: number) => {
        if (readonly) return;
        const clamped = clampNumber(newValue, numericOptions?.min, numericOptions?.max);
        onChange(formatNumber(clamped, numericOptions?.precision ?? 0));
    };

    const handleAffinitySlider = (newValue: number) => {
        if (readonly) return;
        const clamped = clampNumber(newValue, affinityOptions?.bipolar ? -1 : 0, 1);
        onChange(clamped.toFixed(2));
    };

    if (widgetType === 'dropdown' || (attrType === 'enum' && (attributeDef?.options || selectOptions?.length))) {
        const options = attributeDef?.options || selectOptions || [];
        return (
            <select
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                disabled={readonly}
                autoFocus={!!attributeDef}
            >
                <option value="">Select an option...</option>
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        );
    }

    if (widgetType === 'date-picker' || attrType === 'date') {
        return (
            <Input
                type="date"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                disabled={readonly}
                autoFocus={!!attributeDef}
            />
        );
    }

    if (widgetType === 'datetime-picker' || attrType === 'datetime') {
        return (
            <Input
                type="datetime-local"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                disabled={readonly}
                autoFocus={!!attributeDef}
            />
        );
    }

    if (attrType === 'boolean' || widgetType === 'boolean') {
        const boolValue = value === 'true';
        return (
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        boolValue
                            ? 'bg-green-600 border-green-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300'
                    } ${readonly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700 hover:border-green-400'}`}
                    onClick={() => !readonly && handleChange(boolValue ? 'false' : 'true')}
                    disabled={readonly}
                >
                    {boolValue ? <ToggleRightIcon className="w-5 h-5" /> : <ToggleLeftIcon className="w-5 h-5" />}
                    <span className="font-medium">{boolValue ? 'True' : 'False'}</span>
                </button>
                {attributeDef?.description && (
                    <span className="text-xs text-gray-500">{attributeDef.description}</span>
                )}
            </div>
        );
    }

    if (affinityOptions || attrType === 'affinity') {
        const bipolar = affinityOptions?.bipolar ?? true;
        const min = bipolar ? -1 : 0;
        const max = 1;
        const currentValue = parseFloat(value) || 0;
        const clampedValue = clampNumber(currentValue, min, max);

        return (
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={0.01}
                        value={clampedValue}
                        onChange={(e) => handleAffinitySlider(parseFloat(e.target.value))}
                        disabled={readonly}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none accent-indigo-500 cursor-pointer"
                    />
                    <span className={`w-16 text-right font-mono ${clampedValue > 0 ? 'text-green-400' : clampedValue < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {clampedValue.toFixed(2)}
                    </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                    <span>{bipolar ? 'Dislike' : 'None'}</span>
                    <span>Neutral</span>
                    <span>Like</span>
                </div>
                {attributeDef?.description && (
                    <div className="text-xs text-gray-500">{attributeDef.description}</div>
                )}
            </div>
        );
    }

    if (widgetType === 'number-input' || attrType === 'number') {
        const precision = numericOptions?.precision ?? (attributeDef as any)?.precision ?? 0;
        const min = numericOptions?.min ?? (attributeDef as any)?.min ?? 0;
        const max = numericOptions?.max ?? (attributeDef as any)?.max ?? 1000;
        const unit = numericOptions?.unit ?? (attributeDef as any)?.unit ?? '';
        const currentValue = parseNumericValue(value);
        const clampedValue = clampNumber(currentValue, min, max);

        const step = precision > 0 ? Math.pow(10, -precision) : 1;

        return (
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => handleNumericSlider(clampedValue - step)}
                        disabled={readonly || clampedValue <= min}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <MinusIcon className="w-4 h-4" />
                    </button>
                    <Input
                        type="number"
                        step={step}
                        min={min}
                        max={max}
                        value={formatNumber(clampedValue, precision)}
                        onChange={handleNumericInput}
                        placeholder={unit ? `${unit}` : '0'}
                        className="flex-1 text-center"
                        disabled={readonly}
                        autoFocus={!!attributeDef}
                    />
                    <button
                        type="button"
                        onClick={() => handleNumericSlider(clampedValue + step)}
                        disabled={readonly || clampedValue >= max}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                    {unit && <span className="text-sm text-gray-500 font-medium w-16">{unit}</span>}
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={clampedValue}
                    onChange={(e) => handleNumericSlider(parseFloat(e.target.value))}
                    disabled={readonly}
                    className="h-2 bg-gray-700 rounded-lg appearance-none accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                    <span>{min}</span>
                    <span>{max}</span>
                </div>
                {attributeDef?.description && (
                    <div className="text-xs text-gray-500">{attributeDef.description}</div>
                )}
            </div>
        );
    }

    if (widgetType === 'map-picker' || attrType === 'geo') {
        return (
            <div className="flex gap-2">
                <Input
                    type="text"
                    className="flex-1"
                    placeholder="lat,lng"
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    disabled={readonly}
                    autoFocus={!!attributeDef}
                />
                {onPickLocation && !readonly && (
                    <Button
                        type="button"
                        onClick={async () => {
                            const result = onPickLocation();
                            if (result instanceof Promise) {
                                const loc = await result;
                                if (loc) handleChange(loc);
                            }
                        }}
                        variant="secondary"
                        icon={MapIcon}
                        title="Pick from Map"
                    >
                        Map
                    </Button>
                )}
            </div>
        );
    }

    return (
        <Input
            type="text"
            placeholder={
                attributeDef?.description
                    ? `e.g. for ${attributeDef.description}`
                    : 'e.g. Active, 100, 2024-01-01'
            }
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            disabled={readonly}
            autoFocus={!!attributeDef}
        />
    );
}