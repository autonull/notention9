import React from 'react';

interface OperatorDropdownProps {
    value: string;
    options: string[];
    onChange: (op: string) => void;
}

export const OperatorDropdown: React.FC<OperatorDropdownProps> = ({ value, options, onChange }) => {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
            {options.map(op => (
                <option key={op} value={op}>{op}</option>
            ))}
        </select>
    );
};
