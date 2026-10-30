import {useEffect} from 'react';
import {initializeStrategySystem} from './useStrategyResolver';

/**
 * Initialize the strategy system on app startup
 * Registers UI strategies with core registry and sets up default profiles
 */
export function useStrategyInit(): void {
    useEffect(() => {
        let mounted = true;
        
        async function init() {
            try {
                await initializeStrategySystem();
                if (mounted) {
                    console.log('[StrategySystem] Initialized successfully');
                }
            } catch (err) {
                console.error('[StrategySystem] Initialization failed:', err);
            }
        }
        
        init();
        
        return () => {
            mounted = false;
        };
    }, []);
}