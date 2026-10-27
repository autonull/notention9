import { useEffect, useCallback } from 'react';
import { matchesShortcut, isInputFocused, type ShortcutHandler } from '../utils/shortcuts';

export const useKeyboardShortcuts = (shortcuts: ShortcutHandler[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isInputFocused(event.target as HTMLElement)) {
      return;
    }

    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut)) {
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