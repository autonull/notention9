/**
 * Strategy resolver hook - simplified version
 * Uses centralized profile registry and strategy resolver
 */

import { useMemo, useContext, createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    profileRegistry,
    type StrategyProfile,
    type UserProfileConfig,
} from '@notention/core/ui/ProfileRegistry';
import { strategyRegistry, type Seam, type Strategy } from '@notention/core/ui/strategy';
import { JsonStore } from '@notention/core/storage';
import { SEAM_ROLES, type SeamRole, resolveSeamId } from '../constants/seams';
import { initializeStrategySystem, persistUserConfig } from './strategyResolverInit';

// Strategy context for React components
interface StrategyContextValue {
    resolveStrategy: (seamRole: SeamRole) => Strategy | undefined;
    getActiveProfile: () => StrategyProfile | undefined;
    setActiveProfile: (profileId: string) => boolean;
    setOverride: (seamRole: SeamRole, strategyId: string) => void;
    removeOverride: (seamRole: SeamRole) => void;
    setManualMode: (manual: boolean) => void;
    userId: string;
    isManualMode: boolean;
    activeProfileId: string;
    overrides: Record<string, string>;
}

const StrategyContext = createContext<StrategyContextValue | null>(null);

export function useStrategy(): StrategyContextValue {
    const context = useContext(StrategyContext);
    if (!context) {
        throw new Error('useStrategy must be used within a StrategyProvider');
    }
    return context;
}

interface StrategyProviderProps {
    children: ReactNode;
    userId?: string;
}

export function StrategyProvider({ children, userId = 'default-user' }: StrategyProviderProps) {
    const [userConfig, setUserConfigState] = useState(() => profileRegistry.getUserConfig(userId));

    // Sync with profileRegistry on mount
    useEffect(() => {
        setUserConfigState(profileRegistry.getUserConfig(userId));
    }, [userId]);

    const persistConfig = useCallback(() => { persistUserConfig(userId); }, [userId]);

    const resolveStrategy = useMemo(
        () => (seamRole: SeamRole) => {
            return profileRegistry.resolveStrategy(userId, seamRole, strategyRegistry);
        },
        [userId]
    );

    const getActiveProfile = useMemo(
        () => () => {
            const config = profileRegistry.getUserConfig(userId);
            return profileRegistry.getProfile(config.activeProfileId);
        },
        [userId]
    );

    const setActiveProfile = useMemo(() => (profileId: string) => {
        const result = profileRegistry.setActiveProfile(userId, profileId);
        if (result) {
            setUserConfigState(profileRegistry.getUserConfig(userId));
            persistConfig();
        }
        return result;
    }, [userId, persistConfig]);

    const setOverride = useMemo(() => (seamRole: SeamRole, strategyId: string) => {
        const seamId = resolveSeamId(seamRole, strategyRegistry);
        profileRegistry.setOverride(userId, seamId, strategyId);
        setUserConfigState(profileRegistry.getUserConfig(userId));
        persistConfig();
    }, [userId, persistConfig]);

    const removeOverride = useMemo(() => (seamRole: SeamRole) => {
        const seamId = resolveSeamId(seamRole, strategyRegistry);
        profileRegistry.removeOverride(userId, seamId);
        setUserConfigState(profileRegistry.getUserConfig(userId));
        persistConfig();
    }, [userId, persistConfig]);

    const setManualMode = useMemo(() => (manual: boolean) => {
        profileRegistry.setManualMode(userId, manual);
        setUserConfigState(profileRegistry.getUserConfig(userId));
        persistConfig();
    }, [userId, persistConfig]);

    const value = useMemo(
        () => ({
            resolveStrategy,
            getActiveProfile,
            setActiveProfile,
            setOverride,
            removeOverride,
            setManualMode,
            userId,
            isManualMode: userConfig.manualMode,
            activeProfileId: userConfig.activeProfileId,
            overrides: userConfig.overrides.overrides,
        }),
        [
            resolveStrategy,
            getActiveProfile,
            setActiveProfile,
            setOverride,
            removeOverride,
            setManualMode,
            userId,
            userConfig.manualMode,
            userConfig.activeProfileId,
            userConfig.overrides.overrides,
        ]
    );

    return <StrategyContext.Provider value={value}>{children}</StrategyContext.Provider>;
}

// Hook for components to use a specific seam's strategy
export function useSeamStrategy<P = Record<string, unknown>>(seamRole: SeamRole): Strategy<P> | undefined {
    const { resolveStrategy } = useStrategy();
    return resolveStrategy(seamRole) as Strategy<P> | undefined;
}

// Re-export for convenience
export { initializeStrategySystem } from './strategyResolverInit';