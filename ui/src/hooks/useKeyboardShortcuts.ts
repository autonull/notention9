import {useEffect} from 'react';

interface UseKeyboardShortcutsProps {
    onNewNote: () => void;
    onSearch: () => void;
    onCommandPalette: () => void;
    onPropertyPalette?: () => void;
    onSave?: () => void;
    onPreviousNote?: () => void;
    onNextNote?: () => void;
    onBackToList?: () => void;
    onToggleSidebar?: () => void;
    onEscape?: () => void;
}

export function useKeyboardShortcuts({
                                         onNewNote,
                                         onSearch,
                                         onCommandPalette,
                                         onPropertyPalette,
                                         onSave,
                                         onPreviousNote,
                                         onNextNote,
                                         onBackToList,
                                         onToggleSidebar,
                                         onEscape
                                     }: UseKeyboardShortcutsProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMeta = e.metaKey || e.ctrlKey;
            const isAlt = e.altKey;
            const isShift = e.shiftKey;

            // Global Escape
            if (e.key === 'Escape') {
                onEscape?.();
                // Don't prevent default always, inputs might need it
            }

            // Skip if focusing on input elements (except specific shortcuts)
            if (e.target instanceof HTMLElement &&
                (e.target.tagName === 'INPUT' ||
                    e.target.tagName === 'TEXTAREA' ||
                    e.target.contentEditable === 'true')) {

                // Allow Ctrl+S to work even in inputs
                if ((isMeta && e.key.toLowerCase() === 's') ||
                    (isMeta && e.key === 'Enter')) { // Ctrl+Enter to save/submit?
                    // Proceed
                } else {
                    return;
                }
            }

            // Command Palette: Ctrl+K or Cmd+K
            if (isMeta && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                onCommandPalette();
            }

            // Property Palette: Ctrl+Shift+P (standard VSCode style)
            // or maybe Ctrl+; ?
            if (isMeta && isShift && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                onPropertyPalette?.();
            }

            // New Note: Ctrl+N or Cmd+N
            if (isMeta && !isShift && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                onNewNote();
            }

            // Save Note: Ctrl+S or Cmd+S
            if (isMeta && e.key.toLowerCase() === 's') {
                e.preventDefault();
                onSave?.();
            }

            // Search Sidebar: Ctrl+/ or Cmd+/
            if (isMeta && e.key === '/') {
                e.preventDefault();
                onSearch();
            }

            // Also support Ctrl+Shift+F for search
            if (isMeta && isShift && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                onSearch();
            }

            // Navigation shortcuts
            if (isAlt && e.key === 'ArrowUp') {
                e.preventDefault();
                onPreviousNote?.();
            }

            if (isAlt && e.key === 'ArrowDown') {
                e.preventDefault();
                onNextNote?.();
            }

            if (isAlt && e.key === 'ArrowLeft') {
                e.preventDefault();
                onBackToList?.();
            }

            // Toggle sidebar: Ctrl+\ or Ctrl+B
            if (isMeta && (e.key === '\\' || e.key.toLowerCase() === 'b')) {
                e.preventDefault();
                onToggleSidebar?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        onNewNote,
        onSearch,
        onCommandPalette,
        onPropertyPalette,
        onSave,
        onPreviousNote,
        onNextNote,
        onBackToList,
        onToggleSidebar,
        onEscape
    ]);
};
