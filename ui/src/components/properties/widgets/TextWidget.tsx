import React from 'react';
import type {TextWidgetProps} from './types';

export function TextWidget({value, onChange, onKeyDown, placeholder}: TextWidgetProps) {
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
