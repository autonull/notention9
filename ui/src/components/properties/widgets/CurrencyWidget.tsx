import React, {useState} from 'react';

interface WidgetProps {
    value: string;
    onChange: (val: string) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const CurrencyWidget: React.FC<WidgetProps> = ({value, onChange, onKeyDown}) => {
    const [numValue, setNumValue] = useState(parseFloat(value) || 0);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setNumValue(val);
        onChange(val.toString());
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
            setNumValue(val);
            onChange(val.toString());
        } else if (e.target.value === '') {
            setNumValue(0);
            onChange('');
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="text-gray-400">$</span>
                <input
                    type="number"
                    value={numValue}
                    onChange={handleInput}
                    onKeyDown={onKeyDown}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <input
                type="range"
                min="0"
                max="2000"
                step="10"
                value={numValue}
                onChange={handleSliderChange}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
        </div>
    );
};
