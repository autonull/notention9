import React, { createContext, ReactNode, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useLocalForage } from '../../hooks/useLocalForage';
import type { AppSettings } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { DEFAULT_RELAYS } from '@notention/core';

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
    'notention-settings-v2',
    {
      aiEnabled: false,
      developerMode: false,
      theme: 'dark',
      nostr: {
        privkey: null,
        relays: DEFAULT_RELAYS,
      },
      ontology: [],
      customTemplates: [],
    }
  );

  // Populate with default ontology on first run
  useEffect(() => {
    if (
      !settingsLoading &&
      (!settings.ontology || settings.ontology.length === 0)
    ) {
      setSettings((s) => ({ ...s, ontology: DEFAULT_ONTOLOGY }));
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

  // Listen for developer mode toggle event
  useEffect(() => {
    const handleToggleDeveloperMode = () => {
      setSettings(prevSettings => ({
        ...prevSettings,
        developerMode: !prevSettings.developerMode
      }));
    };

    window.addEventListener('toggleDeveloperMode', handleToggleDeveloperMode);

    return () => {
      window.removeEventListener('toggleDeveloperMode', handleToggleDeveloperMode);
    };
  }, [setSettings]);

  return (
    <SettingsContext.Provider
      value={{ settings, setSettings, settingsLoading }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export { SettingsContext };
