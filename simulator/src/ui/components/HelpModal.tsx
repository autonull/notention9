import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Keyboard, ChevronRight, ChevronDown, Zap, Film, MonitorPlay, HelpCircle, ArrowLeft, ArrowRight, Home } from 'lucide-react';

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
    const sectionsContainerRef = useRef<HTMLDivElement>(null);

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
                    // Navigate sections
                    const visibleSections = filteredSections;
                    if (visibleSections.length === 0) return;
                    const currentIndex = visibleSections.findIndex(s => s.id === selectedSection);
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
    }, [isOpen, onClose, selectedSection, filteredSections]);

    const filteredSections = useMemo(() => {
        if (!searchQuery) return helpSections;
        const query = searchQuery.toLowerCase();
        return helpSections.filter(s => 
            s.title.toLowerCase().includes(query) ||
            s.content.toLowerCase().includes(query) ||
            s.shortcuts?.some(sc => sc.description.toLowerCase().includes(query)) ||
            s.id.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" 
            onClick={onClose}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label="Help & Documentation"
        >
            <div className="bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[85vh] border border-gray-700 shadow-2xl relative flex flex-col animate-slide-in-up" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex items-center gap-4">
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <Keyboard size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Help & Documentation</h2>
                            <p className="text-xs text-gray-500">Shortcuts, guides, and tips</p>
                        </div>
                    </div>
                    
                    <div className="relative flex-1 max-w-md mx-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setSelectedSection(null); }}
                            onKeyDown={e => e.stopPropagation()}
                            placeholder="Search help... (try 'shortcuts', 'logs', 'delete')"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-10 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                            autoComplete="off"
                            spellCheck={false}
                            aria-label="Search help"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white touch-target"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setShowShortcuts(!showShortcuts)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target-48 ${
                            showShortcuts 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                        }`}
                        aria-pressed={showShortcuts}
                    >
                        <HelpCircle size={16} />
                        Shortcuts
                    </button>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors touch-target"
                        aria-label="Close help"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-0 overflow-auto flex-1">
                    {showShortcuts ? (
                        <ShortcutsReference onClose={() => setShowShortcuts(false)} />
                    ) : (
                        <div className="flex h-full min-h-0">
                            {/* Sidebar Navigation */}
                            <nav 
                                className="w-56 lg:w-64 bg-gray-900/50 border-r border-gray-700/50 flex-shrink-0 overflow-auto custom-scrollbar p-4" 
                                aria-label="Help sections"
                            >
                                <ul className="space-y-1" role="listbox">
                                    {helpSections.map((section) => (
                                        <li key={section.id}>
                                            <button
                                                onClick={() => setSelectedSection(section.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 touch-target ${
                                                    selectedSection === section.id
                                                        ? 'bg-indigo-900/50 text-white border border-indigo-500/30'
                                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                                }`}
                                                role="option"
                                                aria-selected={selectedSection === section.id}
                                            >
                                                <div className="flex-shrink-0 w-8 h-8">{section.icon}</div>
                                                <span className="truncate text-sm font-medium">{section.title.replace(' — ', '\n').split('\n')[0]}</span>
                                                <ChevronRight size={14} className="text-gray-500 ml-auto flex-shrink-0" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                
                                <div className="mt-6 pt-4 border-t border-gray-700/50">
                                    <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Quick Actions</p>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('navigate', { detail: '/', })); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors touch-target text-sm"
                                        >
                                            <Home size={16} />
                                            Go to Studio
                                        </button>
                                        <button
                                            onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('navigate', { detail: '/movies', })); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors touch-target text-sm"
                                        >
                                            <Film size={16} />
                                            Browse Library
                                        </button>
                                        <button
                                            onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('navigate', { detail: '/live', })); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors touch-target text-sm"
                                        >
                                            <MonitorPlay size={16} />
                                            Live Preview
                                        </button>
                                    </div>
                                </div>
                            </nav>

                            {/* Content Panel */}
                            <div className="flex-1 min-w-0 p-6 lg:p-8 overflow-auto custom-scrollbar">
                                {selectedSection ? (
                                    <SectionDetail 
                                        section={helpSections.find(s => s.id === selectedSection)!}
                                        allSections={helpSections}
                                    />
                                ) : (
                                    <SearchResults sections={filteredSections} />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-900/50">
                    <p className="text-xs text-gray-500 text-center">
                        Simulations run on the server. Closing this window won't stop recording, but you'll lose live preview until reconnect.
                    </p>
                </div>
            </div>
        </div>
    );
};

const SectionDetail = ({ section, allSections }: { section: HelpSection; allSections: HelpSection[] }) => (
    <article className="space-y-6 animate-fade-in stagger-children">
        <header className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-900/50 flex items-center justify-center flex-shrink-0">
                {section.icon}
            </div>
            <div className="flex-1">
                <h3 className="text-2xl font-bold text-white">{section.title}</h3>
                {section.related && section.related.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {section.related.map(id => {
                            const related = allSections.find(s => s.id === id);
                            return related ? (
                                <button
                                    key={id}
                                    onClick={() => window.dispatchEvent(new CustomEvent('help-select-section', { detail: id }))}
                                    className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                                >
                                    {related.title.split(' — ')[0]}
                                </button>
                            ) : null;
                        })}
                    </div>
                )}
            </div>
        </header>

        {section.content && <p className="text-gray-300 leading-relaxed text-base">{section.content}</p>}

        {section.shortcuts && section.shortcuts.length > 0 && (
            <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Keyboard size={16} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Keyboard Shortcuts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {section.shortcuts.map((sc, j) => (
                        <div key={j} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                            <kbd className="px-2.5 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 font-mono text-xs min-w-[80px] text-center flex-shrink-0">
                                {sc.key}
                            </kbd>
                            <span className="text-gray-400 truncate">{sc.description}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </article>
);

const SearchResults = ({ sections }: { sections: HelpSection[] }) => (
    <div className="animate-fade-in stagger-children">
        <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-gray-400" />
            <h3 className="font-semibold text-white">Search Results ({sections.length})</h3>
        </div>
        {sections.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
                <p>No results found</p>
                <p className="text-sm mt-2">Try different keywords</p>
            </div>
        ) : (
            <div className="space-y-4">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => window.dispatchEvent(new CustomEvent('help-select-section', { detail: section.id }))}
                        className="w-full p-4 rounded-xl bg-gray-900/50 border border-gray-700/50 text-left hover:border-indigo-500/50 hover:bg-indigo-900/10 transition-colors"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                                {section.icon}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-white">{section.title}</h4>
                                {section.content && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{section.content}</p>}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        )}
    </div>
);

const ShortcutsReference = ({ onClose }: { onClose: () => void }) => {
    const allShortcuts = helpSections.flatMap(s => 
        (s.shortcuts || []).map(sc => ({ ...sc, section: s.title.split(' — ')[0] }))
    );

    const categories = [
        { name: 'Navigation', shortcuts: allShortcuts.filter(s => ['1','2','3'].includes(s.key.replace(/[^0-9]/g, '')) || s.description.includes('Navigate')) },
        { name: 'Studio', shortcuts: allShortcuts.filter(s => s.section === 'Studio') },
        { name: 'Live Preview', shortcuts: allShortcuts.filter(s => s.section === 'Live Preview') },
        { name: 'Library', shortcuts: allShortcuts.filter(s => s.section === 'Library') },
        { name: 'Global', shortcuts: allShortcuts.filter(s => s.section === 'Global') },
        { name: 'Command Palette', shortcuts: allShortcuts.filter(s => s.section === 'Command Palette') },
        { name: 'Pro Tips', shortcuts: allShortcuts.filter(s => s.section === 'Pro Tips') },
    ].filter(c => c.shortcuts.length > 0);

    return (
        <div className="p-6 lg:p-8 overflow-auto custom-scrollbar animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">All Keyboard Shortcuts</h3>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors touch-target-48"
                >
                    Back to Help
                </button>
            </div>

            <div className="space-y-6">
                {categories.map((cat, i) => (
                    <section key={cat.name} className="stagger-children" style={{animationDelay: `${i * 30}ms`}}>
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center">
                                <Keyboard size={12} className="text-gray-500" />
                            </span>
                            {cat.name}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cat.shortcuts.map((sc, j) => (
                                <div key={j} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-900/50 border border-gray-700/50 hover:border-indigo-500/30 transition-colors">
                                    <kbd className="px-2.5 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 font-mono text-xs min-w-[90px] text-center flex-shrink-0">
                                        {sc.key}
                                    </kbd>
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
