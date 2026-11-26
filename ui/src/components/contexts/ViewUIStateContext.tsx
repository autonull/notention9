import React, { createContext, ReactNode, useState } from 'react';

export interface ViewUIStateContextType {
    isPaletteOpen: boolean;
    setIsPaletteOpen: (isOpen: boolean) => void;
    isHelpOpen: boolean;
    setIsHelpOpen: (isOpen: boolean) => void;
    uisgMode: string | undefined;
    setUisgMode: (mode: string | undefined) => void;
}

const ViewUIStateContext = createContext<ViewUIStateContextType | undefined>(undefined);

export function ViewUIStateProvider({ children }: { children: ReactNode }) {
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [uisgMode, setUisgMode] = useState<string | undefined>(undefined);

    return (
        <ViewUIStateContext.Provider
            value={{
                isPaletteOpen,
                setIsPaletteOpen,
                isHelpOpen,
                setIsHelpOpen,
                uisgMode,
                setUisgMode,
            }}
        >
            {children}
        </ViewUIStateContext.Provider>
    );
}

export { ViewUIStateContext };
export const useViewUIState = () => {
    const ctx = React.useContext(ViewUIStateContext);
    if (!ctx) throw new Error('useViewUIState must be used within ViewUIStateProvider');
    return ctx;
};