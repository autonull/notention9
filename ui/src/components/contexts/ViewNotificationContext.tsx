import React, { createContext, ReactNode, useState, useCallback } from 'react';
import type { NostrEvent, Property } from '@notention/core';
import { useToast } from '../../hooks/useToast';
import { Logger } from '@notention/core';

export interface MatchResult {
    localNoteId: string;
    event: NostrEvent;
    score: number;
    timestamp: number;
    satisfied?: Property[];
}

export interface ViewNotificationContextType {
    matches: MatchResult[];
    addMatch: (match: MatchResult) => void;
    clearNotifications: () => void;
    notificationCount: number;
    chatNotificationCount: number;
    incrementChatNotification: () => void;
    resetChatNotification: () => void;
}

const ViewNotificationContext = createContext<ViewNotificationContextType | undefined>(undefined);

export function ViewNotificationProvider({ children }: { children: ReactNode }) {
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [chatNotificationCount, setChatNotificationCount] = useState(0);
    const { addToast } = useToast();
    const logger = Logger.getInstance();

    const addMatch = useCallback((match: MatchResult) => {
        setMatches(prev => {
            if (prev.some(m => m.event.id === match.event.id && m.localNoteId === match.localNoteId)) {
                return prev;
            }
            return [match, ...prev];
        });
    }, []);

    const clearNotifications = useCallback(() => {
        setMatches([]);
    }, []);

    const incrementChatNotification = useCallback(() => setChatNotificationCount(c => c + 1), []);
    const resetChatNotification = useCallback(() => setChatNotificationCount(0), []);

    const notificationCount = matches.length;

    return (
        <ViewNotificationContext.Provider
            value={{
                matches,
                addMatch,
                clearNotifications,
                notificationCount,
                chatNotificationCount,
                incrementChatNotification,
                resetChatNotification
            }}
        >
            {children}
        </ViewNotificationContext.Provider>
    );
}

export { ViewNotificationContext };
export const useViewNotification = () => {
    const ctx = React.useContext(ViewNotificationContext);
    if (!ctx) throw new Error('useViewNotification must be used within ViewNotificationProvider');
    return ctx;
};