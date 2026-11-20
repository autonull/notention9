import {useEffect} from 'react';
import {useDegradedMode} from './useDegradedMode';

interface AIDegradedModeOptions {
    loading: boolean;
    error: Error | null;
    fallbackUsed: boolean;
    providerUsed: string;
    providerKind: string;
    enabled?: boolean;
}

/**
 * Hook to automatically track AI extraction degraded modes.
 * Call this in components that use AI extraction to surface LLM timeout/fallback states.
 */
export function useAIDegradedMode(options: AIDegradedModeOptions) {
    const {loading, error, fallbackUsed, providerUsed, providerKind, enabled = true} = options;
    const {addDegradedMode, removeDegradedMode} = useDegradedMode();

    useEffect(() => {
        if (!enabled) {
            removeDegradedMode('llm-timeout');
            removeDegradedMode('llm-fallback');
            return;
        }

        // Check for timeout errors
        if (error && (error.message.includes('Timeout') || error.message.includes('timeout'))) {
            addDegradedMode({
                type: 'llm-timeout',
                message: `AI extraction timed out (${providerUsed}). Using local heuristic extraction.`,
                severity: 'warning',
                dismissible: true,
                action: {
                    label: 'Retry',
                    onClick: () => {
                        // The component using this hook should handle retry
                        window.dispatchEvent(new CustomEvent('retry-ai-extraction'));
                        removeDegradedMode('llm-timeout');
                    }
                }
            });
        } else {
            removeDegradedMode('llm-timeout');
        }

        // Check for fallback to heuristic
        if (fallbackUsed && providerKind === 'heuristic') {
            addDegradedMode({
                type: 'llm-fallback',
                message: `AI provider unavailable (${providerUsed}). Using local heuristic extraction.`,
                severity: 'warning',
                dismissible: true,
                action: {
                    label: 'Settings',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('open-settings', {detail: {tab: 'ai'}}));
                    }
                }
            });
        } else {
            removeDegradedMode('llm-fallback');
        }
    }, [loading, error, fallbackUsed, providerUsed, providerKind, enabled, addDegradedMode, removeDegradedMode]);
}