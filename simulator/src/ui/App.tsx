import React, { useState, useCallback, useMemo } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Film, Clapperboard, MonitorPlay, HelpCircle, Keyboard, Command, Menu, X, Play, Film as FilmIcon, MonitorPlay as MonitorPlayIcon, Settings, Trash2, Download, RefreshCw, HelpCircle as HelpCircleIcon } from 'lucide-react';
import Studio from './components/Studio';
import MovieLibrary from './components/MovieLibrary';
import LivePreview from './components/LivePreview';
import HelpModal from './components/HelpModal';
import CommandPalette from './components/CommandPalette';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { useKeyboardShortcuts, formatShortcut, SHORTCUT_CATEGORIES } from './hooks/useKeyboardShortcuts';

const AppContent = () => {
  const [showHelp, setShowHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;

  const commandItems = useMemo(() => [
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
      icon: <FilmIcon size={18} />,
      action: () => navigate('/movies'),
      keywords: ['library', 'movies', 'manage', 'videos'],
      category: 'Navigation',
    },
    {
      id: 'nav-live',
      label: 'Go to Live Preview',
      description: 'Watch running simulations',
      shortcut: '3',
      icon: <MonitorPlayIcon size={18} />,
      action: () => navigate('/live'),
      keywords: ['live', 'preview', 'watch', 'running'],
      category: 'Navigation',
    },
    {
      id: 'help',
      label: 'Show Help',
      description: 'Open documentation and shortcuts reference',
      shortcut: '?',
      icon: <HelpCircleIcon size={18} />,
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
      icon: <RefreshCw size={18} />,
      action: () => window.location.reload(),
      keywords: ['refresh', 'reload', 'update'],
      category: 'Actions',
    },
  ], [navigate]);

  const shortcuts = [
    {
      key: '1',
      handler: () => navigate('/'),
      description: 'Go to Studio',
      category: SHORTCUT_CATEGORIES.navigation,
    },
    {
      key: '2',
      handler: () => navigate('/movies'),
      description: 'Go to Library',
      category: SHORTCUT_CATEGORIES.navigation,
    },
    {
      key: '3',
      handler: () => navigate('/live'),
      description: 'Go to Live Preview',
      category: SHORTCUT_CATEGORIES.navigation,
    },
    {
      key: 'k',
      meta: true,
      handler: () => setShowCommandPalette(true),
      description: 'Open Command Palette',
      category: SHORTCUT_CATEGORIES.actions,
    },
    {
      key: '?',
      shift: true,
      handler: () => setShowHelp(true),
      description: 'Show Help',
      category: SHORTCUT_CATEGORIES.actions,
    },
    {
      key: 'escape',
      handler: () => {
        setShowHelp(false);
        setShowCommandPalette(false);
        setSidebarOpen(false);
      },
      description: 'Close Modals / Sidebar',
      category: SHORTCUT_CATEGORIES.actions,
    },
  ];

  useKeyboardShortcuts(shortcuts);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowCommandPalette(true);
    }
  };

  const navItems = [
    { path: '/', icon: Clapperboard, label: 'Studio', shortcut: '1' },
    { path: '/movies', icon: Film, label: 'Library', shortcut: '2' },
    { path: '/live', icon: MonitorPlay, label: 'Live Preview', shortcut: '3' },
  ];

  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        items={commandItems}
      />
      
      <div className="flex h-screen bg-gray-900 text-white font-sans" onKeyDown={handleKeyDown}>
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <nav className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 flex flex-col p-4 transform transition-transform duration-300 ease-in-out lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Clapperboard className="text-indigo-500" />
              Movie Studio
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white p-2"
              aria-label="Close sidebar"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-1 flex-1">
            {navItems.map((item, index) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({isActive}) => `flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                title={`${item.label} ${formatShortcut(shortcuts[index])}`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                <kbd className="ml-auto text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">{item.shortcut}</kbd>
              </NavLink>
            ))}
          </div>

          <div className="border-t border-gray-700 pt-4 space-y-2">
            <button
              onClick={() => { setShowCommandPalette(true); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-gray-400 hover:bg-gray-700 hover:text-white"
              title={`Command Palette ${formatShortcut(shortcuts[3])}`}
            >
              <Command size={20} />
              <span>Command Palette</span>
              <kbd className="ml-auto text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">{navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}</kbd>
            </button>
            <button
              onClick={() => { setShowHelp(true); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-gray-400 hover:bg-gray-700 hover:text-white"
              title={`Documentation ${formatShortcut(shortcuts[4])}`}
            >
              <HelpCircle size={20} />
              <span>Documentation</span>
              <kbd className="ml-auto text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">?</kbd>
            </button>
          </div>
        </nav>

        <main id="main-content" className="flex-1 overflow-hidden bg-gray-950 p-4 lg:p-8 lg:ml-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed bottom-4 right-4 z-50 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full shadow-lg"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          <Routes>
            <Route path="/" element={<ErrorBoundary><Studio /></ErrorBoundary>} />
            <Route path="/movies" element={<ErrorBoundary><MovieLibrary /></ErrorBoundary>} />
            <Route path="/live" element={<ErrorBoundary><LivePreview /></ErrorBoundary>} />
          </Routes>
        </main>
      </div>
    </>
  );
};

const App = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;