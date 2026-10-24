import { useEffect, useCallback } from 'react';

interface ShortcutHandler {
    (event: KeyboardEvent): void;
}

interface Shortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    handler: ShortcutHandler;
    description: string;
    category: string;
}

export const useKeyboardShortcuts = (shortcuts: Shortcut[]) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        const target = event.target as HTMLElement;
        
        // Don't trigger shortcuts when typing in inputs
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable
        ) {
            return;
        }

        for (const shortcut of shortcuts) {
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatch = (shortcut.ctrl ?? false) === (event.ctrlKey || event.metaKey);
            const shiftMatch = (shortcut.shift ?? false) === event.shiftKey;
            const altMatch = (shortcut.alt ?? false) === event.altKey;

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                event.preventDefault();
                shortcut.handler(event);
                break;
            }
        }
    }, [shortcuts]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

export const formatShortcut = (shortcut: Shortcut): string => {
    const parts: string[] = [];
    if (shortcut.meta || shortcut.ctrl) parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
};

export const SHORTCUT_CATEGORIES = {
    navigation: 'Navigation',
    actions: 'Actions',
    view: 'View',
} as const;