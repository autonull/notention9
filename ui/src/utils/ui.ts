export const getLogStyle = (type: string) => {
    switch (type) {
        case 'match':
            return 'border-yellow-500 text-yellow-200 bg-yellow-900/10';
        case 'ontology':
            return 'border-green-500 text-green-300 bg-green-900/10';
        case 'reuse':
            return 'border-blue-400 text-blue-300 bg-blue-900/10';
        default:
            return 'border-gray-500 text-gray-400 bg-gray-800/20';
    }
};

/**
 * Shared UI styles and classes
 */
import { useContext } from 'react';

export const UI_STYLES = {
    input: {
        base: "w-full bg-gray-900/50 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed",
        padding: "px-3 py-2.5",
        error: "border-red-500/50 focus:border-red-500 focus:ring-red-500/50",
        label: "block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider",
        errorText: "mt-1 text-xs text-red-500"
    }
};

/**
 * Higher-order function (macro) to create a hook for consuming a React context.
 * Reduces boilerplate and ensures consistent error handling.
 */
export function createContextHook<T>(
    context: React.Context<T | undefined>,
    hookName: string,
    providerName: string
): () => T {
    return () => {
        const value = useContext(context);
        if (value === undefined) {
            throw new Error(`${hookName} must be used within a ${providerName}`);
        }
        return value;
    };
}

/**
 * Macro to create a generic update function for note-related states.
 * Reduces duplication in optimized editing hooks.
 */
export function createUpdateHandler<T>(
    setter: React.Dispatch<React.SetStateAction<T | null>>,
    changeNotifier?: (hasChanges: boolean) => void
) {
    return (updater: (prev: T) => T) => {
        setter(prev => {
            if (!prev) return prev;
            if (changeNotifier) changeNotifier(true);
            return updater(prev);
        });
    };
}
