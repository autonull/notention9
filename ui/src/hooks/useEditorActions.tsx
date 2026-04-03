import React, { createContext, useContext } from 'react';
import type {SuggestedAttribute} from '@notention/core';

interface EditorActionsContextType {
    onPickLocation?: () => Promise<string> | void;
    suggestions?: SuggestedAttribute[];
}

const EditorActionsContext = createContext<EditorActionsContextType>({});

export const EditorActionsProvider = ({
    children,
    onPickLocation,
    suggestions = []
}: React.PropsWithChildren<EditorActionsContextType>) => {
    return (
        <EditorActionsContext.Provider value={{ onPickLocation, suggestions }}>
            {children}
        </EditorActionsContext.Provider>
    );
};

export const useEditorActions = () => useContext(EditorActionsContext);
