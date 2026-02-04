import React from 'react';

import { useSettings } from '../../hooks/useSettingsContext';
import { useView } from '../../hooks/useViewContext';
import { useNoteActions } from '../../hooks/useNoteActions';
import { DEFAULT_TEMPLATES, generateTemplatesFromOntology } from '@notention/core';
import type { View, Template } from '@notention/core';
import { NavButton } from './NavButton';
import { IconButton } from '../common/IconButton';
import {
  SidebarIcon,
  SearchIcon
} from '../common/icons';
import { NewNoteButton } from './NewNoteButton';
import { ConnectionStatus } from './ConnectionStatus';
import { NAV_ITEMS, SETTINGS_VIEW } from '../../utils/navigation';

interface HeaderProps {
  onNewNote: () => void;
}

export function Header({ onNewNote }: HeaderProps) {
  const {
    activeView,
    setActiveView,
    notificationCount,
    isSidebarOpen,
    setIsSidebarOpen,
    chatNotificationCount,
    selectedNoteId,
    setSelectedNoteId,
    setIsPaletteOpen
  } = useView();
  const { settings } = useSettings();
  const { createNoteAndNavigate } = useNoteActions();

  const handleNavClick = (view: View) => {
    if (view === 'notes' && activeView === 'notes' && selectedNoteId) {
      setSelectedNoteId(null);
    } else {
      setActiveView(view);
    }
  };

  const handleCreateIntent = (type: 'request' | 'offer') => {
    const isRequest = type === 'request';
    const content = isRequest
      ? `#request\n[intent:is:request]\n[status:is:open]\n\nI am looking for...`
      : `#offer\n[intent:is:offer]\n[status:is:available]\n\nI can provide...`;

    createNoteAndNavigate(
      isRequest ? 'New Request' : 'New Offer',
      content
    );
  };

  const handleCreateFromTemplate = (template: Template) => {
    createNoteAndNavigate(undefined, template.content);
  };

  const generatedTemplates = React.useMemo(() => {
    return generateTemplatesFromOntology(settings.ontology);
  }, [settings.ontology]);

  // Combine generated templates with custom ones
  const allTemplates = [...generatedTemplates, ...settings.customTemplates];

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.requiresDeveloperMode && !settings.developerMode) return false;
    return true;
  });

  return (
    <header className="flex-shrink-0 bg-gray-900 h-16 px-4 flex items-center justify-between border-b border-gray-700/50">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <IconButton
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          tooltip={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
          tooltipPosition="bottom"
          icon={SidebarIcon}
          variant="ghost"
          size="lg"
          className="hidden md:flex"
        />

        <NewNoteButton
          onNewNote={onNewNote}
          onCreateIntent={handleCreateIntent}
          templates={allTemplates}
          onCreateFromTemplate={handleCreateFromTemplate}
        />

        <IconButton
          onClick={() => setIsPaletteOpen(true)}
          tooltip="Search & Commands (Ctrl+K)"
          tooltipPosition="bottom"
          icon={SearchIcon}
          variant="ghost"
          size="lg"
        />
      </div>

      {/* Center Section - Navigation */}
      <div className="flex items-center gap-2">
        {filteredNavItems.map((item) => {
          const badgeCount = item.badgeCountKey
            ? (item.badgeCountKey === 'notificationCount' ? notificationCount : chatNotificationCount)
            : undefined;
          return (
            <NavButton
              key={item.id}
              icon={<item.icon />}
              label={item.label}
              tooltip={item.label}
              isActive={activeView === item.id}
              onClick={() => handleNavClick(item.id)}
              badgeCount={badgeCount}
            />
          );
        })}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <ConnectionStatus />
        <NavButton
          icon={<SETTINGS_VIEW.icon />}
          label={SETTINGS_VIEW.label}
          tooltip={SETTINGS_VIEW.label}
          isActive={activeView === SETTINGS_VIEW.id}
          onClick={() => setActiveView(SETTINGS_VIEW.id)}
        />
      </div>
    </header>
  );
}
