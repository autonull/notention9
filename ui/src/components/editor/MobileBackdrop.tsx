/**
 * MobileBackdrop - Backdrop for mobile sidebar
 * Extracted from EditorManager for separation of concerns
 */
import React from 'react';

interface MobileBackdropProps {
    isVisible: boolean;
    onClick: () => void;
}

export function MobileBackdrop({isVisible, onClick}: MobileBackdropProps) {
    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300"
            onClick={onClick}
        />
    );
}