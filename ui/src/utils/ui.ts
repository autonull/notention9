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
 * Utility to conditionally join class names
 */
export function cn(...classes: (string | undefined | null | false | Record<string, boolean>)[]): string {
    return classes
        .flatMap(c => {
            if (!c) return [];
            if (typeof c === 'string') return c.split(' ');
            return Object.entries(c).filter(([, v]) => v).map(([k]) => k);
        })
        .join(' ');
}

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
