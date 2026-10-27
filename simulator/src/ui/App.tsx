import React, { useState, useMemo, useCallback } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Clapperboard, Film, MonitorPlay, HelpCircle, Keyboard, Command, Menu, X } from 'lucide-react';
import Studio from './components/Studio';
import MovieLibrary from './components/MovieLibrary';
import LivePreview from './components/LivePreview';
import HelpModal from './components/HelpModal';
import CommandPalette from './components/CommandPalette';
import { ToastProvider } from './components/ui';
import ErrorBoundary from './components/ErrorBoundary';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { GLOBAL_SHORTCUTS } from './utils/shortcuts';
import { NAV_ITEMS, createCommandItems, formatNavShortcut } from './config/navigation';
import { Button, IconButton, Kbd } from './components/ui';
import { Sidebar } from './components/Layout';

const AppContent = () => {
  const [showHelp, setShowHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const commandItems = useMemo(() => createCommandItems(navigate, setShowHelp, setShowCommandPalette), [navigate]);

  const shortcuts = useMemo(() => [
    { ...GLOBAL_SHORTCUTS.navStudio, handler: () => navigate('/') },
    { ...GLOBAL_SHORTCUTS.navLibrary, handler: () => navigate('/movies') },
    { ...GLOBAL_SHORTCUTS.navLive, handler: () => navigate('/live') },
    { ...GLOBAL_SHORTCUTS.commandPalette, handler: () => setShowCommandPalette(true) },
    { ...GLOBAL_SHORTCUTS.help, handler: () => setShowHelp(true) },
    { ...GLOBAL_SHORTCUTS.closeModals, handler: () => { setShowHelp(false); setShowCommandPalette(false); setSidebarOpen(false); } },
  ], [navigate]);

  useKeyboardShortcuts(shortcuts);

  const handleCommandPalette = useCallback(() => {
    setShowCommandPalette(true);
    setSidebarOpen(false);
  }, []);

  const handleHelp = useCallback(() => {
    setShowHelp(true);
    setSidebarOpen(false);
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        items={commandItems}
      />

      <div className="flex h-screen bg-gray-900 text-white font-sans">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          shortcuts={shortcuts}
          onCommandPalette={handleCommandPalette}
          onHelp={handleHelp}
        />

        <main id="main-content" className="flex-1 overflow-hidden bg-gray-950 p-4 lg:p-8 lg:ml-0">
          <MobileMenuButton onClick={() => setSidebarOpen(true)} />

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

const MobileMenuButton = ({ onClick }: { onClick: () => void }) => (
  <IconButton
    onClick={onClick}
    className="lg:hidden fixed bottom-4 right-4 z-50 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
    aria-label="Open menu"
    size="md"
  >
    <Menu size={24} />
  </IconButton>
);

const App = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;