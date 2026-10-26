import React, { useState, useCallback, useMemo } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Clapperboard, Film, MonitorPlay, HelpCircle, Keyboard, Command, Menu, X, Play, Film as FilmIcon, MonitorPlay as MonitorPlayIcon, Settings, Trash2, Download, RefreshCw, HelpCircle as HelpCircleIcon, ChevronDown, ChevronUp } from 'lucide-react';
import Studio from './components/Studio';
import MovieLibrary from './components/MovieLibrary';
import LivePreview from './components/LivePreview';
import HelpModal from './components/HelpModal';
import CommandPalette from './components/CommandPalette';
import { ToastProvider } from './components/ui';
import ErrorBoundary from './components/ErrorBoundary';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { formatShortcut } from './utils';
import { SHORTCUT_CATEGORIES, NAV_ITEMS, createCommandItems, COMMAND_PALETTE_SHORTCUTS, formatNavShortcut, MOBILE_MENU_BUTTON, SIDEBAR_CLOSE_BUTTON } from './config/navigation';
import { Button, IconButton, Kbd } from './components/ui';
import { Card } from './components/ui';

const AppContent = () => {
  const [showHelp, setShowHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const commandItems = useMemo(() => createCommandItems(navigate, setShowHelp, setShowCommandPalette), [navigate]);

  const shortcuts = useMemo(() => [
    { key: '1', handler: () => navigate('/'), description: 'Go to Studio', category: SHORTCUT_CATEGORIES.navigation },
    { key: '2', handler: () => navigate('/movies'), description: 'Go to Library', category: SHORTCUT_CATEGORIES.navigation },
    { key: '3', handler: () => navigate('/live'), description: 'Go to Live Preview', category: SHORTCUT_CATEGORIES.navigation },
    { key: 'k', meta: true, handler: () => setShowCommandPalette(true), description: 'Open Command Palette', category: SHORTCUT_CATEGORIES.actions },
    { key: '?', shift: true, handler: () => setShowHelp(true), description: 'Show Help', category: SHORTCUT_CATEGORIES.actions },
    { key: 'Escape', handler: () => { setShowHelp(false); setShowCommandPalette(false); setSidebarOpen(false); }, description: 'Close Modals / Sidebar', category: SHORTCUT_CATEGORIES.actions },
  ], [navigate]);

  useKeyboardShortcuts(shortcuts);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowCommandPalette(true);
    }
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
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

        <nav
          className={`
            fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 flex flex-col p-4
            transform transition-transform duration-300 ease-in-out lg:transform-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Clapperboard className="text-indigo-500" />
              Movie Studio
            </h1>
            <IconButton
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              size="sm"
              className="lg:hidden"
            >
              <X size={24} />
            </IconButton>
          </div>

          <div className="space-y-1 flex-1">
            {NAV_ITEMS.map((item, index) => {
              const shortcut = shortcuts[index];
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 p-3 rounded-lg transition-colors
                    ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}
                  `}
                  title={`${item.label} ${formatNavShortcut(shortcut)}`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                  <Kbd className="ml-auto text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">{item.shortcut}</Kbd>
                </NavLink>
              );
            })}
          </div>

          <div className="border-t border-gray-700 pt-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => { setShowCommandPalette(true); setSidebarOpen(false); }}
              icon={<Command size={20} />}
              iconPosition="left"
            >
              Command Palette
              <Kbd className="ml-auto text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded hidden sm:inline-flex">
                {navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
              </Kbd>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => { setShowHelp(true); setSidebarOpen(false); }}
              icon={<HelpCircle size={20} />}
              iconPosition="left"
            >
              Documentation
              <Kbd className="ml-auto text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded hidden sm:inline-flex">?</Kbd>
            </Button>
          </div>
        </nav>

        <main id="main-content" className="flex-1 overflow-hidden bg-gray-950 p-4 lg:p-8 lg:ml-0">
          {/* Mobile menu button */}
          <IconButton
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed bottom-4 right-4 z-50 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
            aria-label="Open menu"
            size="md"
          >
            <Menu size={24} />
          </IconButton>

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