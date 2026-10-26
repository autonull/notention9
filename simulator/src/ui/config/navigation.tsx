import { Clapperboard, Film, MonitorPlay, HelpCircle, Keyboard, Command, Menu, X, Search, Settings } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  shortcut: string;
  description: string;
  keywords: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: '/',
    label: 'Studio',
    icon: Clapperboard,
    shortcut: '1',
    description: 'Create new simulation movies',
    keywords: ['studio', 'create', 'new', 'simulation'],
  },
  {
    path: '/movies',
    label: 'Library',
    icon: Film,
    shortcut: '2',
    description: 'Manage recorded movies',
    keywords: ['library', 'movies', 'manage', 'videos'],
  },
  {
    path: '/live',
    label: 'Live Preview',
    icon: MonitorPlay,
    shortcut: '3',
    description: 'Watch running simulations',
    keywords: ['live', 'preview', 'watch', 'running'],
  },
];

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
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

export const GLOBAL_SHORTCUTS = {
  commandPalette: { key: 'k', meta: true, description: 'Open Command Palette', category: 'actions' as const },
  help: { key: '?', shift: true, description: 'Show Help', category: 'actions' as const },
  closeModals: { key: 'Escape', description: 'Close Modals / Sidebar', category: 'actions' as const },
  navStudio: { key: '1', description: 'Go to Studio', category: 'navigation' as const },
  navLibrary: { key: '2', description: 'Go to Library', category: 'navigation' as const },
  navLive: { key: '3', description: 'Go to Live Preview', category: 'navigation' as const },
} as const;

export interface CommandItem {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords: string[];
  category: string;
  hidden?: boolean;
}

export const createCommandItems = (
  navigate: (path: string) => void,
  setShowHelp: (show: boolean) => void,
  setShowCommandPalette: (show: boolean) => void
): CommandItem[] => [
  {
    id: 'nav-studio',
    label: 'Go to Studio',
    description: 'Create new simulation movies',
    shortcut: '1',
    icon: <Clapperboard size={18} />,
    action: () => navigate('/'),
    keywords: ['studio', 'create', 'new', 'simulation'],
    category: 'Navigation',
  },
  {
    id: 'nav-library',
    label: 'Go to Library',
    description: 'Manage recorded movies',
    shortcut: '2',
    icon: <Film size={18} />,
    action: () => navigate('/movies'),
    keywords: ['library', 'movies', 'manage', 'videos'],
    category: 'Navigation',
  },
  {
    id: 'nav-live',
    label: 'Go to Live Preview',
    description: 'Watch running simulations',
    shortcut: '3',
    icon: <MonitorPlay size={18} />,
    action: () => navigate('/live'),
    keywords: ['live', 'preview', 'watch', 'running'],
    category: 'Navigation',
  },
  {
    id: 'help',
    label: 'Show Help',
    description: 'Open documentation and shortcuts reference',
    shortcut: '?',
    icon: <HelpCircle size={18} />,
    action: () => setShowHelp(true),
    keywords: ['help', 'documentation', 'shortcuts', 'guide'],
    category: 'Help',
  },
  {
    id: 'shortcuts',
    label: 'Keyboard Shortcuts',
    description: 'View all available keyboard shortcuts',
    shortcut: '⌘K',
    icon: <Keyboard size={18} />,
    action: () => setShowCommandPalette(true),
    keywords: ['shortcuts', 'keys', 'hotkeys', 'keyboard'],
    category: 'Help',
  },
  {
    id: 'refresh',
    label: 'Refresh Data',
    description: 'Reload current view data',
    shortcut: 'Ctrl+R',
    icon: <Settings size={18} />,
    action: () => window.location.reload(),
    keywords: ['refresh', 'reload', 'update'],
    category: 'Actions',
  },
];

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
      { label: 'Command Palette', keys: ['⌘', 'K'] },
      { label: 'Show Help', keys: ['?'] },
      { label: 'Close Modals', keys: ['Esc'] },
    ],
  },
];

export const formatShortcut = (shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }): string => {
  const parts: string[] = [];
  if (shortcut.meta || shortcut.ctrl) parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join(' + ');
};

export const MOBILE_MENU_BUTTON = {
  icon: Menu,
  ariaLabel: 'Open menu',
};

export const SIDEBAR_CLOSE_BUTTON = {
  icon: X,
  ariaLabel: 'Close sidebar',
};

export const COMMAND_PALETTE_HINT = {
  icon: Command,
  shortcut: navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K',
};