import React, { useMemo, useEffect, useState } from 'react';
import { useStrategy } from '../hooks/useStrategyResolver';
import { SEAM_ROLES, type SeamRole } from '../constants/seams';
import { type Strategy } from '@notention/core/ui/strategy';
import { initializeStrategySystem } from '../hooks/strategyResolverInit';

interface StrategyResolverProps {
    seamRole: SeamRole;
    props: Record<string, unknown>;
    fallback?: React.ReactNode;
    /** Optional key to force re-resolution when strategy registry changes */
    resolutionKey?: number;
}

/**
 * Renders the resolved strategy for a given seam role.
 * Uses the profile registry to resolve the active strategy based on user config,
 * experiments, revisions, and profile selections.
 */
export function StrategyResolver({ seamRole, props, fallback, resolutionKey = 0 }: StrategyResolverProps) {
    const { resolveStrategyOnly } = useStrategy();
    
    const [strategy, setStrategy] = useState<Strategy | undefined>(undefined);
    const [initialized, setInitialized] = useState(false);
    
    // Wait for strategy system initialization, then resolve strategy
    useEffect(() => {
        let mounted = true;
        
        async function initAndResolve() {
            try {
                await initializeStrategySystem();
                if (!mounted) return;
                setInitialized(true);
                const newStrategy = resolveStrategyOnly(seamRole);
                setStrategy(newStrategy);
            } catch (err) {
                console.error('[StrategyResolver] Initialization failed:', err);
                if (mounted) setInitialized(true);
            }
        }
        
        initAndResolve();
        
        return () => {
            mounted = false;
        };
    }, [resolveStrategyOnly, seamRole, resolutionKey]);
    
    // Re-resolve when resolutionKey changes (e.g., after revision params applied)
    useEffect(() => {
        if (!initialized) return;
        const newStrategy = resolveStrategyOnly(seamRole);
        setStrategy(newStrategy);
    }, [resolveStrategyOnly, seamRole, resolutionKey, initialized]);
    
    if (!initialized) {
        return <>{fallback ?? <div data-testid="strategy-resolver-loading">Loading strategy...</div>}</>;
    }
    
    if (!strategy) {
        console.warn(`[StrategyResolver] No strategy resolved for seam role: ${seamRole}`);
        return <>{fallback}</>;
    }
    
    const Component = strategy.render as (props: Record<string, unknown>) => React.ReactElement;
    const strategyProps = (strategy.getDefaultProps?.() ?? {}) as Record<string, unknown>;
    return <Component {...strategyProps} {...props} />;
}

/**
 * Hook to get the resolved strategy for a seam role (for advanced use cases)
 */
export function useResolvedStrategy(seamRole: SeamRole): Strategy | undefined {
    const { resolveStrategyOnly } = useStrategy();
    return useMemo(() => resolveStrategyOnly(seamRole), [resolveStrategyOnly, seamRole]);
}

// Re-export seam roles for convenience
export { SEAM_ROLES };