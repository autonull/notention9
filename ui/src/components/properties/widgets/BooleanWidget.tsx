import React from 'react';

interface WidgetProps {
    value: string;
    onChange: (val: string) => void;
}

export const BooleanWidget: React.FC<WidgetProps> = ({value, onChange}) => {
    const isTrue = value === 'true' || value === true;

    return (
        <div className="flex gap-2">
            <button
                className={`px-3 py-1 text-xs rounded transition-colors border ${isTrue ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                onClick={() => onChange('true')}
            >
                Yes
            </button>
            <button
                className={`px-3 py-1 text-xs rounded transition-colors border ${!isTrue ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                onClick={() => onChange('false')}
            >
                No
            </button>
        </div>
    );
};
