import type {Dispatch, SetStateAction} from 'react';
import React, {createContext, ReactNode, useEffect} from 'react';
import {useLocalForage} from '../../hooks/useLocalForage';
import type {AppSettings} from '@notention/core';
import {validateSettings, DEFAULT_APP_SETTINGS} from '@notention/core/config';
import {DEFAULT_ONTOLOGY, DEFAULT_RELAYS} from '@notention/core';
import {STORAGE_KEYS} from '../../config/storageKeys';

interface SettingsContextType {
    settings: AppSettings;
    setSettings: Dispatch<SetStateAction<AppSettings>>;
    settingsLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
    undefined
);

export function SettingsProvider({
                                     children,
                                 }: { children: ReactNode }) {
    const [settings, setSettings, settingsLoading] = useLocalForage<AppSettings>(
        STORAGE_KEYS.settings,
        DEFAULT_APP_SETTINGS
    );

    // Validate settings after loading from storage
    useEffect(() => {
        if (!settingsLoading) {
            setSettings(prev => validateSettings(prev));
        }
    }, [settingsLoading, setSettings]);

    // Populate with default ontology on first run
    useEffect(() => {
        if (
            !settingsLoading &&
            (!settings.ontology || settings.ontology.length === 0)
        ) {
            setSettings((s) => ({...s, ontology: DEFAULT_ONTOLOGY}));
        }
    }, [settings.ontology, settingsLoading, setSettings]);

    // Ensure relays are populated if missing (migration for existing users)
    useEffect(() => {
        if (!settingsLoading && !settings.nostr.relays) {
            setSettings(s => ({
                ...s,
                nostr: {
                    ...s.nostr,
                    relays: DEFAULT_RELAYS
                }
            }));
        }
    }, [settings.nostr.relays, settingsLoading, setSettings]);

    return (
        <SettingsContext.Provider
            value={{settings, setSettings, settingsLoading}}
        >
            {children}
        </SettingsContext.Provider>
    );
};

export {SettingsContext};
