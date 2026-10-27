export interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  shortcuts?: { key: string; description: string }[];
  related?: string[];
}

export const helpSections: HelpSection[] = [
  {
    id: 'studio',
    title: 'Studio — Create Movies',
    icon: <Zap size={20} className="text-indigo-400" />,
    content: 'Launch new simulations. Choose a pre-defined scenario (like \'Gig Economy\') or generate a random one. Configure the number of agents and duration for random scenarios. Click "Show Details" on any scenario to see its description and default settings.',
    shortcuts: [
      { key: '1', description: 'Navigate to Studio' },
      { key: 'Tab', description: 'Navigate form fields' },
      { key: '⌘Enter / Ctrl+Enter', description: 'Start production' },
      { key: '⌘K / Ctrl+K', description: 'Open Command Palette' },
    ],
    related: ['library', 'live'],
  },
  {
    id: 'live',
    title: 'Live Preview — Watch Simulations',
    icon: <MonitorPlay size={20} className="text-blue-400" />,
    content: 'Monitor the simulation in real-time. The dashboard shows agent interactions and system logs. You can filter logs by level (error, warn, info, debug), search within logs, pause auto-scroll, and copy/download logs. The connection indicator shows dashboard connectivity status.',
    shortcuts: [
      { key: '3', description: 'Navigate to Live Preview' },
      { key: 'Esc', description: 'Toggle logs panel' },
      { key: 'Ctrl+L / ⌘L', description: 'Focus log search' },
      { key: 'Ctrl+Space / ⌘Space', description: 'Pause/resume auto-scroll' },
      { key: '←/→ Arrow keys', description: 'Resize logs panel (when focused)' },
    ],
    related: ['studio', 'library'],
  },
  {
    id: 'library',
    title: 'Library — Manage Movies',
    icon: <Film size={20} className="text-purple-400" />,
    content: 'Access your recorded simulations. Preview generated MP4 videos, download them, or delete old recordings. Switch between list and grid views. Sort by name, date, size, or duration. Use checkboxes (or Cmd/Ctrl+click) for multi-select and bulk delete. Search filters by filename.',
    shortcuts: [
      { key: '2', description: 'Navigate to Library' },
      { key: 'Ctrl+F / ⌘F', description: 'Focus search' },
      { key: 'Enter', description: 'Preview selected movie' },
      { key: 'Cmd/Ctrl+Click', description: 'Multi-select' },
      { key: 'Shift+Click', description: 'Range select' },
      { key: 'Esc', description: 'Clear selection' },
      { key: 'Cmd/Ctrl+A', description: 'Select all visible' },
    ],
    related: ['studio', 'live'],
  },
  {
    id: 'global',
    title: 'Global Shortcuts',
    icon: <Keyboard size={20} className="text-green-400" />,
    content: 'These shortcuts work from anywhere in the app.',
    shortcuts: [
      { key: '⌘K / Ctrl+K', description: 'Open Command Palette' },
      { key: '?', description: 'Show this help' },
      { key: 'Esc', description: 'Close modals / sidebar' },
      { key: '1 / 2 / 3', description: 'Quick navigation' },
    ],
    related: [],
  },
  {
    id: 'command-palette',
    title: 'Command Palette (⌘K / Ctrl+K)',
    icon: <HelpCircle size={20} className="text-yellow-400" />,
    content: 'Your universal search and action bar. Type to find commands, navigate views, or search notes. Shows recent items when empty. Press ? for shortcuts reference. Supports fuzzy matching.',
    shortcuts: [
      { key: '⌘K / Ctrl+K', description: 'Open palette' },
      { key: '↑ / ↓', description: 'Navigate results' },
      { key: 'Enter', description: 'Execute action' },
      { key: '?', description: 'Show shortcuts help' },
      { key: 'Esc', description: 'Close palette' },
    ],
    related: ['global'],
  },
  {
    id: 'tips',
    title: 'Pro Tips',
    icon: <Zap size={20} className="text-pink-400" />,
    content: '',
    shortcuts: [
      { key: 'Double-click scenario', description: 'Auto-start production (Studio)' },
      { key: 'Hover movie card', description: 'Preview actions appear (Library)' },
      { key: 'Click log line', description: 'Copy to clipboard (Live)' },
      { key: 'Resize sidebar', description: 'Drag handle or use keyboard (App-wide)' },
    ],
    related: [],
  },
];

export const quickActions = [
  { label: 'Go to Studio', icon: Home, navigate: '/' },
  { label: 'Browse Library', icon: Film, navigate: '/movies' },
  { label: 'Live Preview', icon: MonitorPlay, navigate: '/live' },
];

export function getShortcutsByCategory(sections: HelpSection[]) {
  const allShortcuts = sections.flatMap((s) =>
    (s.shortcuts || []).map((sc) => ({ ...sc, section: s.title.split(' — ')[0] }))
  );

  const categories = [
    { name: 'Navigation', shortcuts: allShortcuts.filter((s) => ['1', '2', '3'].includes(s.key.replace(/[^0-9]/g, '')) || s.description.includes('Navigate')) },
    { name: 'Studio', shortcuts: allShortcuts.filter((s) => s.section === 'Studio') },
    { name: 'Live Preview', shortcuts: allShortcuts.filter((s) => s.section === 'Live Preview') },
    { name: 'Library', shortcuts: allShortcuts.filter((s) => s.section === 'Library') },
    { name: 'Global', shortcuts: allShortcuts.filter((s) => s.section === 'Global') },
    { name: 'Command Palette', shortcuts: allShortcuts.filter((s) => s.section === 'Command Palette') },
    { name: 'Pro Tips', shortcuts: allShortcuts.filter((s) => s.section === 'Pro Tips') },
  ].filter((c) => c.shortcuts.length > 0);

  return categories;
}