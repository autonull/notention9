import {useCallback, useState} from 'react';
import type React from 'react';

export interface ListNavigationOptions {
    itemCount: number;
    onSelect: (index: number) => void;
    onClose: () => void;
}

export function useListNavigation({itemCount, onSelect, onClose}: ListNavigationOptions) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % itemCount);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + itemCount) % itemCount);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            onSelect(selectedIndex);
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [itemCount, onSelect, onClose, selectedIndex]);

    return {selectedIndex, setSelectedIndex, handleKeyDown};
}
