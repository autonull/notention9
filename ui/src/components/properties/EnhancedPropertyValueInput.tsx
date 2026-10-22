import React from 'react';
import type {OntologyAttribute} from '@notention/core';
import {Input} from '../common/Input';
import {Button} from '../common/Button';
import {MapIcon} from '../common/icons';

interface EnhancedPropertyValueInputProps {
    value: string;
    onChange: (value: string) => void;
    attributeDef?: OntologyAttribute;
    operator?: string;
    onPickLocation?: () => Promise<string> | void;
    onPickTime?: (key: string) => void;
    readonly?: boolean;
    numericOptions?: OntologyAttribute['numericOptions'];
    selectOptions?: string[];
    affinityOptions?: OntologyAttribute['affinityOptions'];
    arity?: OntologyAttribute['arity'];
}

export function EnhancedPropertyValueInput({
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
    arity
}: EnhancedPropertyValueInputProps) {
    const type = attributeDef?.type ?? 'string';

    if (type === 'enum' && (attributeDef.options || selectOptions)) {
        const options = attributeDef.options || selectOptions || [];
        return (
            <select
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus={!!attributeDef}
                disabled={readonly}
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

    if (type === 'date') {
        return (
            <Input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus={!!attributeDef}
                disabled={readonly}
            />
        );
    }

    if (type === 'number') {
        const min = numericOptions?.min ?? attributeDef?.numericOptions?.min;
        const max = numericOptions?.max ?? attributeDef?.numericOptions?.max;
        const step = numericOptions?.precision ?? attributeDef?.numericOptions?.precision ?? 1;
        return (
            <Input
                type="number"
                placeholder="e.g. 100"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus={!!attributeDef}
                disabled={readonly}
                min={min?.toString()}
                max={max?.toString()}
                step={step?.toString()}
            />
        );
    }

    if (type === 'datetime') {
        return (
            <Input
                type="datetime-local"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus={!!attributeDef}
                disabled={readonly}
            />
        );
    }

    if (type === 'boolean') {
        return (
            <select
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus={!!attributeDef}
                disabled={readonly}
            >
                <option value="">Select...</option>
                <option value="true">True</option>
                <option value="false">False</option>
            </select>
        );
    }

    if (type === 'geo') {
        return (
            <div className="flex gap-2">
                <Input
                    type="text"
                    className="flex-1"
                    placeholder="lat,lng"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoFocus={!!attributeDef}
                    disabled={readonly}
                />
                {onPickLocation && !readonly && (
                    <Button
                        type="button"
                        onClick={async () => {
                            const result = onPickLocation();
                            if (result instanceof Promise) {
                                const loc = await result;
                                if (loc) onChange(loc);
                            }
                        }}
                        variant="secondary"
                        icon={MapIcon}
                        title="Pick from Map"
                    />
                )}
            </div>
        );
    }

    if (type === 'affinity' && affinityOptions) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-4 overflow-x-auto pb-2">
                    {['😀', '🙂', '😐', '🙁', '😞', '😍', '😤', '😰', '😴', '🤔'].map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => !readonly && onChange(emoji)}
                            className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all border flex-shrink-0 ${
                                value === emoji
                                    ? 'bg-blue-600/20 border-blue-500/30 text-blue-200 scale-110'
                                    : 'bg-gray-700/30 border-gray-600/30 text-gray-300 hover:bg-gray-700/50'
                            } ${readonly ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={readonly}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
                <Input
                    type="text"
                    placeholder="Or type custom value..."
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={readonly}
                />
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
            onChange={(e) => onChange(e.target.value)}
            autoFocus={!!attributeDef}
            disabled={readonly}
        />
    );
};