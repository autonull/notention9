import { useEffect } from 'react';

interface UseGlobalShortcutsProps {
  onNewNote: () => void;
  onSearch: () => void;
  onCommandPalette: () => void;
}

export const useGlobalShortcuts = ({
  onNewNote,
  onSearch,
  onCommandPalette,
}: UseGlobalShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key === 'k') {
        e.preventDefault();
        onCommandPalette();
      }

      if (isMeta && e.key.toLowerCase() === 'n') {
          e.preventDefault();
          onNewNote();
      }

      // Search Sidebar
      if (isMeta && e.key === '/') {
        e.preventDefault();
        onSearch();
      }

      // Also support Ctrl+Shift+F for search
      if (isMeta && e.shiftKey && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          onSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewNote, onSearch, onCommandPalette]);
};
