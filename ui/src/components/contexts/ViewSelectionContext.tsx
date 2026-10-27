import React, { createContext, ReactNode, useState } from 'react';
import type { View } from '@notention/core';

export interface ViewSelectionContextType {
    selectedNoteId: string | null;
    setSelectedNoteId: (id: string | null) => void;
    matchingNoteId: string | null;
    setMatchingNoteId: (id: string | null) => void;
    selectedChatPubkey: string | null;
    setSelectedChatPubkey: (pubkey: string | null) => void;
}

const ViewSelectionContext = createContext<ViewSelectionContextType | undefined>(undefined);

export function ViewSelectionProvider({ children }: { children: ReactNode }) {
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [matchingNoteId, setMatchingNoteId] = useState<string | null>(null);
    const [selectedChatPubkey, setSelectedChatPubkey] = useState<string | null>(null);

    return (
        <ViewSelectionContext.Provider
            value={{
                selectedNoteId,
                setSelectedNoteId,
                matchingNoteId,
                setMatchingNoteId,
                selectedChatPubkey,
                setSelectedChatPubkey
            }}
        >
            {children}
        </ViewSelectionContext.Provider>
    );
}

export { ViewSelectionContext };
export const useViewSelection = () => {
    const ctx = React.useContext(ViewSelectionContext);
    if (!ctx) throw new Error('useViewSelection must be used within ViewSelectionProvider');
    return ctx;
};