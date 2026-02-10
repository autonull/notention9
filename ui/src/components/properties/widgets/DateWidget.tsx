import React from 'react';

interface WidgetProps {
    value: string;
    onChange: (val: string) => void;
    type?: string;
}

export const DateWidget: React.FC<WidgetProps> = ({ value, onChange, type = 'date' }) => {
    return (
        <input
            type={type === 'datetime' ? 'datetime-local' : 'date'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    );
};
