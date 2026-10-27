import { Clapperboard, Film, MonitorPlay, HelpCircle, Keyboard, Command, Menu, X, Search, Settings } from 'lucide-react';
import { formatShortcut, isMac, GLOBAL_SHORTCUTS, COMMAND_PALETTE_SHORTCUTS, getNavShortcut } from '../utils/shortcuts';

export interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  description: string;
  keywords: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: '/',
    label: 'Studio',
    icon: Clapperboard,
    description: 'Create new simulation movies',
    keywords: ['studio', 'create', 'new', 'simulation'],
  },
  {
    path: '/movies',
    label: 'Library',
    icon: Film,
    description: 'Manage recorded movies',
    keywords: ['library', 'movies', 'manage', 'videos'],
  },
  {
    path: '/live',
    label: 'Live Preview',
    icon: MonitorPlay,
    description: 'Watch running simulations',
    keywords: ['live', 'preview', 'watch', 'running'],
  },
];

export { SHORTCUT_CATEGORIES, type ShortcutCategory } from '../utils/shortcuts';

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
    shortcut: isMac() ? '⌘K' : 'Ctrl+K',
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

export { COMMAND_PALETTE_SHORTCUTS };

export const formatNavShortcut = (index: number): string => {
  return formatShortcut(getNavShortcut(index));
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
  shortcut: isMac() ? '⌘K' : 'Ctrl+K',
};