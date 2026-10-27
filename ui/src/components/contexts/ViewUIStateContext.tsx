import React, { createContext, ReactNode, useState } from 'react';

export interface ViewUIStateContextType {
    isPaletteOpen: boolean;
    setIsPaletteOpen: (isOpen: boolean) => void;
    isHelpOpen: boolean;
    setIsHelpOpen: (isOpen: boolean) => void;
}

const ViewUIStateContext = createContext<ViewUIStateContextType | undefined>(undefined);

export function ViewUIStateProvider({ children }: { children: ReactNode }) {
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    return (
        <ViewUIStateContext.Provider
            value={{
                isPaletteOpen,
                setIsPaletteOpen,
                isHelpOpen,
                setIsHelpOpen
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