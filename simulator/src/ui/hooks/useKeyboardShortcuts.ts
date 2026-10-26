import { useEffect, useCallback } from 'react';
import type { Shortcut } from '../config/navigation';

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