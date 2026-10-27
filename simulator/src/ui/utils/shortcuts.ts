export { isMac } from './index';

export interface ShortcutDef {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export interface ShortcutHandler extends ShortcutDef {
  handler: (event: KeyboardEvent) => void;
  description: string;
  category: 'navigation' | 'actions' | 'view';
}

export const SHORTCUT_CATEGORIES = {
  navigation: 'Navigation',
  actions: 'Actions',
  view: 'View',
} as const;

export type ShortcutCategory = keyof typeof SHORTCUT_CATEGORIES;

export function parseShortcut(shortcut: string): ShortcutDef {
  const parts = shortcut.toLowerCase().split('+').map(p => p.trim());
  return {
    key: parts[parts.length - 1],
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option') || parts.includes('⌥'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('⌘'),
  };
}

export function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutDef): boolean {
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
  const ctrlMatch = (shortcut.ctrl ?? false) === (event.ctrlKey || event.metaKey);
  const shiftMatch = (shortcut.shift ?? false) === event.shiftKey;
  const altMatch = (shortcut.alt ?? false) === event.altKey;
  return keyMatch && ctrlMatch && shiftMatch && altMatch;
}

export function formatShortcutKeys(keys: string[]): string {
  return keys.map(k => {
    if (k === 'meta' || k === 'ctrl') return isMac() ? '⌘' : 'Ctrl';
    if (k === 'shift') return 'Shift';
    if (k === 'alt') return isMac() ? '⌥' : 'Alt';
    return k.toUpperCase();
  }).join(' + ');
}

export function formatShortcut(def: ShortcutDef): string {
  const keys: string[] = [];
  if (def.meta || def.ctrl) keys.push(isMac() ? '⌘' : 'Ctrl');
  if (def.shift) keys.push('Shift');
  if (def.alt) keys.push(isMac() ? '⌥' : 'Alt');
  keys.push(def.key.toUpperCase());
  return keys.join(' + ');
}

export function isInputFocused(target: HTMLElement | null): boolean {
  if (!target) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

export const GLOBAL_SHORTCUTS: Record<string, Omit<ShortcutHandler, 'handler'>> = {
  commandPalette: { key: 'k', meta: true, description: 'Open Command Palette', category: 'actions' },
  help: { key: '?', shift: true, description: 'Show Help', category: 'actions' },
  closeModals: { key: 'Escape', description: 'Close Modals / Sidebar', category: 'actions' },
  navStudio: { key: '1', description: 'Go to Studio', category: 'navigation' },
  navLibrary: { key: '2', description: 'Go to Library', category: 'navigation' },
  navLive: { key: '3', description: 'Go to Live Preview', category: 'navigation' },
} as const;

export const COMMAND_PALETTE_SHORTCUTS = [
  {
    category: 'Navigation',
    shortcuts: [
      { label: 'Studio', keys: ['1'] },
      { label: 'Library', keys: ['2'] },
      { label: 'Live Preview', keys: ['3'] },
    ],
  },
  {
    category: 'Actions',
    shortcuts: [
      { label: 'Command Palette', keys: isMac() ? ['⌘', 'K'] : ['Ctrl', 'K'] },
      { label: 'Show Help', keys: ['?'] },
      { label: 'Close Modals', keys: ['Esc'] },
    ],
  },
];

export function getNavShortcut(index: number): { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } {
  const navKeys = ['1', '2', '3'];
  if (index >= 0 && index < navKeys.length) {
    return { key: navKeys[index] };
  }
  return { key: '' };
}