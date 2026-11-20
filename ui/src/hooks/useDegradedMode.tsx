import {createContext, useContext, useState, useEffect, useCallback, ReactNode} from 'react';

export type DegradedModeType =
    | 'llm-timeout'
    | 'llm-fallback'
    | 'storage-full'
    | 'storage-corrupt'
    | 'sync-failed'
    | 'offline';

export interface DegradedMode {
    type: DegradedModeType;
    message: string;
    severity: 'warning' | 'error';
    dismissible: boolean;
    action?: {
        label: string;
        onClick: () => void;
    };
    timestamp: number;
}

interface DegradedModeContextType {
    degradedModes: DegradedMode[];
    addDegradedMode: (mode: Omit<DegradedMode, 'timestamp'>) => void;
    removeDegradedMode: (type: DegradedModeType) => void;
    clearDegradedModes: () => void;
    isDegraded: (type: DegradedModeType) => boolean;
}

const DegradedModeContext = createContext<DegradedModeContextType | undefined>(undefined);

export function DegradedModeProvider({children}: {children: ReactNode}) {
    const [degradedModes, setDegradedModes] = useState<DegradedMode[]>([]);

    const addDegradedMode = useCallback((mode: Omit<DegradedMode, 'timestamp'>) => {
        setDegradedModes(prev => {
            if (prev.some(m => m.type === mode.type)) return prev;
            return [...prev, {...mode, timestamp: Date.now()}];
        });
    }, []);

    const removeDegradedMode = useCallback((type: DegradedModeType) => {
        setDegradedModes(prev => prev.filter(m => m.type !== type));
    }, []);

    const clearDegradedModes = useCallback(() => {
        setDegradedModes([]);
    }, []);

    const isDegraded = useCallback((type: DegradedModeType) => {
        return degradedModes.some(m => m.type === type);
    }, [degradedModes]);

    return (
        <DegradedModeContext.Provider
            value={{
                degradedModes,
                addDegradedMode,
                removeDegradedMode,
                clearDegradedModes,
                isDegraded,
            }}
        >
            {children}
        </DegradedModeContext.Provider>
    );
}

export function useDegradedMode(): DegradedModeContextType {
    const context = useContext(DegradedModeContext);
    if (!context) {
        throw new Error('useDegradedMode must be used within a DegradedModeProvider');
    }
    return context;
}