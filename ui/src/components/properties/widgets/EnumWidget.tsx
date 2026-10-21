import React from 'react';
import type {EnumWidgetProps} from './types';

export function EnumWidget({value, onChange, options = []}: EnumWidgetProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <option value="" disabled>Select...</option>
            {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    );
}
