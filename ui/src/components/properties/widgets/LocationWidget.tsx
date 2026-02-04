import React, { useState } from 'react';

interface WidgetProps {
    value: string;
    onChange: (val: string) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const LocationWidget: React.FC<WidgetProps> = ({ value, onChange, onKeyDown }) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);

        if (val.length > 2) {
            // Mock geocoding for UI demo
            // Real implementation would hit Nominatim
            if (val.toLowerCase().includes('aus')) {
                setSuggestions(['Austin, TX', 'Austin, MN', 'Australia']);
            } else {
                setSuggestions([]);
            }
        } else {
            setSuggestions([]);
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={handleInput}
                onKeyDown={onKeyDown}
                placeholder="City, Region..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-xl z-20">
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            onClick={() => {
                                onChange(s);
                                setSuggestions([]);
                            }}
                        >
                            📍 {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
