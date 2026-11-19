import React, { useEffect, useState } from 'react';
import { actionRegistry, registerBuiltinActions } from '@notention/core';

/**
 * Initialize the action registry with built-in actions.
 * Call this once at app startup.
 */
export function useActionRegistryInit(): void {
    useEffect(() => {
        registerBuiltinActions();
    }, []);
}

/**
 * Hook for using the action registry in components.
 */
export function useActionRegistry() {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const unsubscribe = actionRegistry.subscribe(() => {
            forceUpdate(n => n + 1);
        });
        return unsubscribe;
    }, []);

    return {
        register: actionRegistry.register.bind(actionRegistry),
        unregister: actionRegistry.unregister.bind(actionRegistry),
        get: actionRegistry.get.bind(actionRegistry),
        getAll: actionRegistry.getAll.bind(actionRegistry),
        getPaletteActions: actionRegistry.getPaletteActions.bind(actionRegistry),
        getKeybindings: actionRegistry.getKeybindings.bind(actionRegistry),
        checkConflict: actionRegistry.checkConflict.bind(actionRegistry),
        handleKeyDown: actionRegistry.handleKeyDown.bind(actionRegistry),
        subscribe: actionRegistry.subscribe.bind(actionRegistry),
    };
}