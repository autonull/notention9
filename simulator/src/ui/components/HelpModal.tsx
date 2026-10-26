import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Keyboard, ChevronRight, ChevronDown, Zap, Film, MonitorPlay, HelpCircle, ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { Button, IconButton, Kbd } from './ui';
import { Card, CardHeader, CardTitle, CardContent } from './ui';
import { Badge } from './ui';
import { Modal } from './ui';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  shortcuts?: { key: string; description: string }[];
  related?: string[];
}

const helpSections: HelpSection[] = [
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

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>('studio');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedSection('studio');
      setShowShortcuts(false);
      setTimeout(() => searchInputRef.current?.focus(), 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const visibleSections = filteredSections;
          if (visibleSections.length === 0) return;
          const currentIndex = visibleSections.findIndex((s) => s.id === selectedSection);
          if (currentIndex >= 0) {
            const nextIndex = e.key === 'ArrowRight'
              ? (currentIndex + 1) % visibleSections.length
              : (currentIndex - 1 + visibleSections.length) % visibleSections.length;
            setSelectedSection(visibleSections[nextIndex].id);
            e.preventDefault();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, selectedSection]);

  const filteredSections = useMemo(() => {
    if (!searchQuery) return helpSections;
    const query = searchQuery.toLowerCase();
    return helpSections.filter((s) =>
      s.title.toLowerCase().includes(query) ||
      s.content.toLowerCase().includes(query) ||
      s.shortcuts?.some((sc) => sc.description.toLowerCase().includes(query)) ||
      s.id.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Help & Documentation"
      size="xl"
      showCloseButton={true}
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      <div className="flex h-full min-h-0">
        {/* Sidebar Navigation */}
        <nav
          className="w-56 lg:w-64 bg-gray-900/50 border-r border-gray-700/50 flex-shrink-0 overflow-auto custom-scrollbar p-4"
          aria-label="Help sections"
        >
          <ul className="space-y-1" role="listbox">
            {helpSections.map((section) => (
              <li key={section.id}>
                <Button
                  variant={selectedSection === section.id ? 'primary' : 'ghost'}
                  className="w-full justify-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
                  onClick={() => setSelectedSection(section.id)}
                  role="option"
                  aria-selected={selectedSection === section.id}
                >
                  <div className="flex-shrink-0 w-8 h-8">{section.icon}</div>
                  <span className="truncate text-sm font-medium">
                    {section.title.replace(' — ', '\n').split('\n')[0]}
                  </span>
                  <ChevronRight size={14} className="text-gray-500 ml-auto flex-shrink-0" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-4 border-t border-gray-700/50">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Quick Actions</p>
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('navigate', { detail: '/' })); }}
              >
                <Home size={16} /> Go to Studio
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('navigate', { detail: '/movies' })); }}
              >
                <Film size={16} /> Browse Library
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('navigate', { detail: '/live' })); }}
              >
                <MonitorPlay size={16} /> Live Preview
              </Button>
            </div>
          </div>
        </nav>

        {/* Content Panel */}
        <div className="flex-1 min-w-0 p-6 lg:p-8 overflow-auto custom-scrollbar">
          {showShortcuts ? (
            <ShortcutsReference onClose={() => setShowShortcuts(false)} />
          ) : selectedSection ? (
            <SectionDetail section={helpSections.find((s) => s.id === selectedSection)!} allSections={helpSections} />
          ) : (
            <SearchResults sections={filteredSections} onSelect={(id) => setSelectedSection(id)} />
          )}
        </div>
      </div>
    </Modal>
  );
};

const SectionDetail = ({ section, allSections }: { section: HelpSection; allSections: HelpSection[] }) => (
  <article className="space-y-6 animate-fade-in stagger-children">
    <header className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-gray-900/50 flex items-center justify-center flex-shrink-0">
        {section.icon}
      </div>
      <div className="flex-1">
        <CardTitle className="text-2xl">{section.title}</CardTitle>
        {section.related && section.related.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {section.related.map((id) => {
              const related = allSections.find((s) => s.id === id);
              return related ? (
                <Button
                  key={id}
                  variant="ghost"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('help-select-section', { detail: id }))}
                >
                  {related.title.split(' — ')[0]}
                </Button>
              ) : null;
            })}
          </div>
        )}
      </div>
    </header>

    {section.content && <p className="text-gray-300 leading-relaxed text-base">{section.content}</p>}

    {section.shortcuts && section.shortcuts.length > 0 && (
      <Card variant="outlined" padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Keyboard size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Keyboard Shortcuts</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {section.shortcuts.map((sc, j) => (
            <div key={j} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-800/50 transition-colors">
              <Kbd>{sc.key}</Kbd>
              <span className="text-gray-400 truncate">{sc.description}</span>
            </div>
          ))}
        </div>
      </Card>
    )}
  </article>
);

const SearchResults = ({ sections, onSelect }: { sections: HelpSection[]; onSelect: (id: string) => void }) => (
  <div className="animate-fade-in stagger-children">
    <div className="flex items-center gap-2 mb-4">
      <Search size={16} className="text-gray-400" />
      <CardTitle>Search Results ({sections.length})</CardTitle>
    </div>
    {sections.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <p>No results found</p>
        <p className="text-sm mt-2">Try different keywords</p>
      </div>
    ) : (
      <div className="space-y-4">
        {sections.map((section) => (
          <Button
            key={section.id}
            variant="ghost"
            className="w-full justify-start p-4 rounded-xl border border-gray-700/50 hover:border-indigo-500/50 hover:bg-indigo-900/10 transition-colors"
            onClick={() => onSelect(section.id)}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                {section.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{section.title}</p>
                {section.content && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{section.content}</p>}
              </div>
            </div>
          </Button>
        ))}
      </div>
    )}
  </div>
);

const ShortcutsReference = ({ onClose }: { onClose: () => void }) => {
  const allShortcuts = helpSections.flatMap((s) =>
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

  return (
    <div className="p-6 lg:p-8 overflow-auto custom-scrollbar animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <CardTitle>All Keyboard Shortcuts</CardTitle>
        <Button variant="secondary" onClick={onClose}>Back to Help</Button>
      </div>

      <div className="space-y-6">
        {categories.map((cat, i) => (
          <section key={cat.name} className="stagger-children" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center">
                <Keyboard size={12} className="text-gray-500" />
              </span>
              {cat.name}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cat.shortcuts.map((sc, j) => (
                <div key={j} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-900/50 border border-gray-700/50 hover:border-indigo-500/30 transition-colors">
                  <Kbd>{sc.key}</Kbd>
                  <span className="text-gray-300 text-sm">{sc.description}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default HelpModal;