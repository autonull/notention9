import React, { createContext, ReactNode, useState } from 'react';
import { useLocalForage } from '../../hooks/useLocalForage';
import { useToast } from '../../hooks/useToast';
import type { View, SortOrder, NostrEvent, SidebarViewMode } from '@notention/core';
import { GeoCoords, Logger } from '@notention/core';
import { getCurrentPosition } from '../../utils/geolocation';

import type { Property } from '@notention/core';

export interface MatchResult {
  localNoteId: string;
  event: NostrEvent;
  score: number;
  timestamp: number;
  satisfied?: Property[];
}

export interface ViewContextType {
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  activeView: View;
  setActiveView: (view: View) => void;
  sidebarViewMode: SidebarViewMode;
  setSidebarViewMode: (mode: SidebarViewMode) => void;
  userLocation: GeoCoords | null;
  refreshUserLocation: () => Promise<void>;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  matchingNoteId: string | null;
  setMatchingNoteId: (id: string | null) => void;
  selectedChatPubkey: string | null;
  setSelectedChatPubkey: (pubkey: string | null) => void;
  showToast: (msg: string) => void;
  notificationCount: number;
  matches: MatchResult[];
  addMatch: (match: MatchResult) => void;
  clearNotifications: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  chatNotificationCount: number;
  incrementChatNotification: () => void;
  resetChatNotification: () => void;
  isPaletteOpen: boolean;
  setIsPaletteOpen: (isOpen: boolean) => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (isOpen: boolean) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({
  children,
}: { children: ReactNode }) {
  const [sortOrder, setSortOrder] = useLocalForage<SortOrder>(
    'notention-sort-order',
    'updatedAt_desc'
  );
  const [sidebarViewMode, setSidebarViewMode] = useLocalForage<SidebarViewMode>(
      'notention-sidebar-view-mode',
      'list'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeView, setActiveView] = useState<View>('notes');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [matchingNoteId, setMatchingNoteId] = useState<string | null>(null);
  const [selectedChatPubkey, setSelectedChatPubkey] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<GeoCoords | null>(null);
  const { addToast } = useToast();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatNotificationCount, setChatNotificationCount] = useState(0);

  const notificationCount = matches.length;

  const showToast = (msg: string) => {
      addToast(msg);
  };

  const addMatch = (match: MatchResult) => {
      setMatches(prev => {
          // Avoid duplicates
          if (prev.some(m => m.event.id === match.event.id && m.localNoteId === match.localNoteId)) {
              return prev;
          }
          return [match, ...prev];
      });
  };

  const clearNotifications = () => {
      // We might want to keep matches but clear the "count" badge?
      // For MVP, let's just assume viewing them clears them or we don't clear them.
      // But the interface needs to exist.
      // Let's implement specific clearing later if needed, for now no-op or clear all?
      // Actually, if we clear matches, we lose the list.
      // Let's just reset the list for now if the user wants to "clear" them.
      // Better: we don't clear them, the badge shows total matches.
      // But the prompt says "alerting users".
  };

  const incrementChatNotification = () => setChatNotificationCount(c => c + 1);
  const resetChatNotification = () => setChatNotificationCount(0);

  const refreshUserLocation = async () => {
      try {
          const loc = await getCurrentPosition();
          setUserLocation(loc);
      } catch (e) {
          Logger.getInstance().error("Failed to get location", e instanceof Error ? e : new Error(String(e)));
          addToast("Could not access location for 'Nearest' sort", 'error');
      }
  };

  return (
    <ViewContext.Provider
      value={{
        activeView,
        setActiveView,
        sidebarViewMode,
        setSidebarViewMode,
        userLocation,
        refreshUserLocation,
        selectedNoteId,
        setSelectedNoteId,
        matchingNoteId,
        setMatchingNoteId,
        selectedChatPubkey,
        setSelectedChatPubkey,
        showToast,
        notificationCount,
        matches,
        addMatch,
        clearNotifications,
        searchTerm,
        setSearchTerm,
        sortOrder,
        setSortOrder,
        isSidebarOpen,
        setIsSidebarOpen,
        chatNotificationCount,
        incrementChatNotification,
        resetChatNotification,
        isPaletteOpen,
        setIsPaletteOpen,
        isHelpOpen,
        setIsHelpOpen
      }}
    >
      {children}
    </ViewContext.Provider>
  );
};

export { ViewContext };
