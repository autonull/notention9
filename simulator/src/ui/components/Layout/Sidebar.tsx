import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Clapperboard, Film, MonitorPlay, HelpCircle, Keyboard, Command, X, Menu } from 'lucide-react';
import { IconButton, Kbd } from '../../components/ui';
import { Button } from '../../components/ui';
import { NAV_ITEMS, formatNavShortcut } from '../../config/navigation';
import { DesignTokens } from '../../components/ui';
import { cn } from '../../utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Array<{ key: string }>;
  onCommandPalette: () => void;
  onHelp: () => void;
}

export const Sidebar = ({ isOpen, onClose, shortcuts, onCommandPalette, onHelp }: SidebarProps) => {
  const location = useLocation();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <nav
        className={cn(`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 flex flex-col p-4
          transform transition-transform duration-300 ease-in-out lg:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `)}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Clapperboard className="text-indigo-500" />
            Movie Studio
          </h1>
          <IconButton
            onClick={onClose}
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
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                )}
                title={`${item.label} ${formatNavShortcut(index)}`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                <Kbd className="ml-auto text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
                  {shortcut.key}
                </Kbd>
              </NavLink>
            );
          })}
        </div>

        <div className="border-t border-gray-700 pt-4 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={onCommandPalette}
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
            onClick={onHelp}
            icon={<HelpCircle size={20} />}
            iconPosition="left"
          >
            Documentation
            <Kbd className="ml-auto text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded hidden sm:inline-flex">?</Kbd>
          </Button>
        </div>
      </nav>
    </>
  );
};

Sidebar.displayName = 'Sidebar';