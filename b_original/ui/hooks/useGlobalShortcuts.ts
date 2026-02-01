import { useEffect } from 'react';

interface UseGlobalShortcutsProps {
  onNewNote: () => void;
  onSearch: () => void;
  onCommandPalette: () => void;
  onSave?: () => void;
  onPreviousNote?: () => void;
  onNextNote?: () => void;
  onBackToList?: () => void;
  onToggleSidebar?: () => void;
  onToggleDeveloperMode?: () => void;
}

export const useGlobalShortcuts = ({
  onNewNote,
  onSearch,
  onCommandPalette,
  onSave,
  onPreviousNote,
  onNextNote,
  onBackToList,
  onToggleSidebar,
  onToggleDeveloperMode,
}: UseGlobalShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if focusing on input elements
      if (e.target instanceof HTMLElement &&
          (e.target.tagName === 'INPUT' ||
           e.target.tagName === 'TEXTAREA' ||
           e.target.contentEditable === 'true')) {
        // Allow Ctrl+S to work even in inputs
        if (!(e.ctrlKey || e.metaKey) || e.key !== 's') {
          return;
        }
      }

      const isMeta = e.metaKey || e.ctrlKey;
      const isAlt = e.altKey;

      // Command Palette: Ctrl+K or Cmd+K
      if (isMeta && e.key === 'k') {
        e.preventDefault();
        onCommandPalette();
      }

      // New Note: Ctrl+N or Cmd+N
      if (isMeta && e.key.toLowerCase() === 'n') {
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
      if (isMeta && e.shiftKey && e.key.toLowerCase() === 'f') {
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

      // Toggle sidebar: Ctrl+\
      if (isMeta && e.key === '\\') {
        e.preventDefault();
        onToggleSidebar?.();
      }

      // Toggle developer mode: Ctrl+Shift+D
      if (isMeta && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onToggleDeveloperMode?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onNewNote,
    onSearch,
    onCommandPalette,
    onSave,
    onPreviousNote,
    onNextNote,
    onBackToList,
    onToggleSidebar,
    onToggleDeveloperMode
  ]);
};
