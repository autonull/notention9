import React, { useMemo, useEffect, useState, Suspense } from 'react';
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
        return <div data-testid="strategy-resolver-loading">{fallback ?? 'Loading strategy...'}</div>;
    }
    
    if (!strategy) {
        console.warn(`[StrategyResolver] No strategy resolved for seam role: ${seamRole}`);
        return <div>{fallback ?? ''}</div>;
    }
    
    const strategyProps = (strategy.getDefaultProps?.() ?? {}) as Record<string, unknown>;
    // Filter out strategy params that are not component props
    // Known strategy params that should not be passed to components
    const strategyOnlyParams = new Set(['initialOp', 'isAdding']);
    const filteredStrategyProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(strategyProps)) {
        if (!strategyOnlyParams.has(key)) {
            filteredStrategyProps[key] = value;
        }
    }
    const mergedProps = {...filteredStrategyProps, ...props};
    console.log('[StrategyResolver] mergedProps:', mergedProps);
    const element = strategy.render(mergedProps);
    
    // Wrap in Suspense to handle potential lazy-loaded component chunks in production
    return (
        <Suspense fallback={<div data-testid="strategy-resolver-loading">{fallback ?? 'Loading strategy...'}</div>}>
            {element}
        </Suspense>
    );
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
