import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PendingConfirmation {
    action: string;
    consequence: string;
}

interface PendingConfirmationsContextValue {
    pendingConfirmations: PendingConfirmation[];
    addPendingConfirmation: (confirmation: PendingConfirmation) => void;
    removePendingConfirmation: (action: string) => void;
    clearPendingConfirmations: () => void;
}

const PendingConfirmationsContext = createContext<PendingConfirmationsContextValue | null>(null);

export function PendingConfirmationsProvider({ children }: { children: ReactNode }) {
    const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);

    const addPendingConfirmation = useCallback((confirmation: PendingConfirmation) => {
        setPendingConfirmations(prev => [...prev, confirmation]);
    }, []);

    const removePendingConfirmation = useCallback((action: string) => {
        setPendingConfirmations(prev => prev.filter(c => c.action !== action));
    }, []);

    const clearPendingConfirmations = useCallback(() => {
        setPendingConfirmations([]);
    }, []);

    return (
        <PendingConfirmationsContext.Provider value={{
            pendingConfirmations,
            addPendingConfirmation,
            removePendingConfirmation,
            clearPendingConfirmations,
        }}>
            {children}
        </PendingConfirmationsContext.Provider>
    );
}

export function usePendingConfirmations(): PendingConfirmationsContextValue {
    const context = useContext(PendingConfirmationsContext);
    if (!context) {
        throw new Error('usePendingConfirmations must be used within a PendingConfirmationsProvider');
    }
    return context;
}