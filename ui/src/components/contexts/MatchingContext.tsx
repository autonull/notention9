import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { MatchEngine, MatchingService, DEFAULT_ONTOLOGY } from '@notention/core';
import { useSettings } from '../../hooks/useSettingsContext';

interface MatchingContextType {
    engine: MatchEngine;
    matchingService: MatchingService;
}

const MatchingContext = createContext<MatchingContextType | undefined>(undefined);

export function MatchingProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettings();
    const value = useMemo(() => ({
        engine: new MatchEngine(settings.ontology ?? DEFAULT_ONTOLOGY),
        matchingService: new MatchingService(settings.ontology ?? DEFAULT_ONTOLOGY),
    }), [settings.ontology]);

    return <MatchingContext.Provider value={value}>{children}</MatchingContext.Provider>;
}

export function useMatching(): MatchingContextType {
    const ctx = useContext(MatchingContext);
    if (!ctx) {
        return { engine: new MatchEngine(DEFAULT_ONTOLOGY), matchingService: new MatchingService(DEFAULT_ONTOLOGY) };
    }
    return ctx;
}
