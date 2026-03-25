import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { MatchEngine, MatchingService } from '@notention/core';
import { useSettings } from '../../hooks/useSettingsContext';

interface MatchingContextType {
    engine: MatchEngine;
    matchingService: MatchingService;
}

const MatchingContext = createContext<MatchingContextType | undefined>(undefined);

export function MatchingProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettings();
    const value = useMemo(() => ({
        engine: new MatchEngine(settings.ontology),
        matchingService: new MatchingService(settings.ontology),
    }), [settings.ontology]);

    return <MatchingContext.Provider value={value}>{children}</MatchingContext.Provider>;
}

export function useMatching(): MatchingContextType {
    const ctx = useContext(MatchingContext);
    if (!ctx) throw new Error('useMatching must be used within MatchingProvider');
    return ctx;
}
