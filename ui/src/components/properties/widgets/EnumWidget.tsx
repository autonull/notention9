import React from 'react';

interface WidgetProps {
    value: string;
    onChange: (val: string) => void;
    options?: string[];
}

export const EnumWidget: React.FC<WidgetProps> = ({ value, onChange, options = [] }) => {
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
};
