import React from 'react';
import type {OntologyAttribute} from '@notention/core';
import {Input} from '../ui/Input';
import {Select} from '../ui/Select';
import {Button} from '../ui/Button';
import {MapIcon} from '../ui/icons';

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
    testId?: string;
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
    arity,
    testId
}: EnhancedPropertyValueInputProps) {
    const type = attributeDef?.type ?? 'string';
    const attrDef = attributeDef;

    if (type === 'enum' && (attrDef?.options || selectOptions)) {
        const options = attrDef?.options || selectOptions || [];
        // Keep an imported or custom value visible and selectable.
        const choices = value && !options.includes(value) ? [value, ...options] : options;
        return (
            <Select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                autoFocus={!!attributeDef}
                disabled={readonly}
                data-testid={testId}
            >
                <option value="">Select an option…</option>
                {choices.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </Select>
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
                data-testid={testId}
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
                data-testid={testId}
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
                data-testid={testId}
            />
        );
    }

    if (type === 'boolean') {
        return (
            <Select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                autoFocus={!!attributeDef}
                disabled={readonly}
                data-testid={testId}
            >
                <option value="">Select…</option>
                <option value="true">True</option>
                <option value="false">False</option>
            </Select>
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
                    data-testid={testId}
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
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl transition-colors ${
                                value === emoji
                                    ? 'border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] text-[var(--app-text)] ring-1 ring-[var(--app-accent-line)]'
                                    : 'border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)]'
                            } ${readonly ? 'cursor-not-allowed opacity-50' : ''}`}
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
                    data-testid={testId}
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
            data-testid={testId}
        />
    );
};