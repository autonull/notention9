import React, { createContext, ReactNode, useState, useCallback } from 'react';
import { useToast } from '../../hooks/useToast';
import type { GeoCoords } from '@notention/core';
import { Logger } from '@notention/core';
import { getCurrentPosition } from '../../utils/geolocation';

export interface ViewLocationContextType {
    userLocation: GeoCoords | null;
    refreshUserLocation: () => Promise<void>;
}

const ViewLocationContext = createContext<ViewLocationContextType | undefined>(undefined);

export function ViewLocationProvider({ children }: { children: ReactNode }) {
    const [userLocation, setUserLocation] = useState<GeoCoords | null>(null);
    const { addToast } = useToast();
    const logger = Logger.getInstance();

    const refreshUserLocation = useCallback(async () => {
        try {
            const loc = await getCurrentPosition();
            setUserLocation(loc);
        } catch (e) {
            logger.error("Failed to get location", e instanceof Error ? e : new Error(String(e)));
            addToast("Could not access location for 'Nearest' sort", 'error');
        }
    }, [addToast]);

    return (
        <ViewLocationContext.Provider
            value={{
                userLocation,
                refreshUserLocation
            }}
        >
            {children}
        </ViewLocationContext.Provider>
    );
}

export { ViewLocationContext };
export const useViewLocation = () => {
    const ctx = React.useContext(ViewLocationContext);
    if (!ctx) throw new Error('useViewLocation must be used within ViewLocationProvider');
    return ctx;
};