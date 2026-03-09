import React from 'react';

interface WidgetProps {
    value: string;
    onChange: (val: string) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    operator?: string;
    options?: string[];
    placeholder?: string;
}

export function TextWidget({value, onChange, onKeyDown, placeholder}: WidgetProps) {
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder || "Value..."}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
        />
    );
}
