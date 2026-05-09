import { useState, useEffect, useCallback } from 'react';
import {
    networkRegistry,
    NostrNetworkProvider,
    MeshtasticNetworkProvider,
    Note
} from '@notention/core';
import { useSettings } from './useSettingsContext';
import { useNotes } from './useNotes';
import { agentService } from '../services/AgentService';

export function useNetworkManagement() {
    const { settings, setSettings } = useSettings();
    const { upsertNote } = useNotes();
    const [providers, setProviders] = useState(() => networkRegistry.getAllProviders());

    useEffect(() => {
        if (!networkRegistry.getProvider('nostr')) {
            const nostr = new NostrNetworkProvider({
                privkey: settings.nostr?.privkey,
                relays: settings.nostr?.relays,
                enabled: settings.privacyMode !== 'local-only'
            });
            networkRegistry.registerProvider(nostr);
        }

        if (!networkRegistry.getProvider('meshtastic')) {
            const mesh = new MeshtasticNetworkProvider({
                enabled: settings.privacyMode !== 'local-only' && (settings as any).meshtastic?.enabled,
                connectionType: (settings as any).meshtastic?.connectionType,
                saveReceivedNotes: (settings as any).meshtastic?.saveReceivedNotes,
                agentService: agentService
            });
            networkRegistry.registerProvider(mesh);
        }

        setProviders(networkRegistry.getAllProviders());
    }, [settings]);

    useEffect(() => {
        const isPrivate = settings.privacyMode === 'local-only';
        networkRegistry.getAllProviders().forEach(p => {
            if (isPrivate) {
                p.enabled = false;
            }
        });
    }, [settings.privacyMode]);

    const toggleProvider = useCallback((id: string, enabled: boolean) => {
        const provider = networkRegistry.getProvider(id);
        if (provider) {
            provider.enabled = enabled;

            if (id === 'nostr') {
            } else if (id === 'meshtastic') {
                setSettings((prev: any) => ({
                    ...prev,
                    meshtastic: {
                        ...(prev.meshtastic || {}),
                        enabled
                    }
                }));
            }

            setProviders([...networkRegistry.getAllProviders()]);
        }
    }, [setSettings]);

    const updateMeshtasticSettings = useCallback((updates: any) => {
        setSettings((prev: any) => ({
            ...prev,
            meshtastic: {
                ...(prev.meshtastic || {}),
                ...updates
            }
        }));
    }, [setSettings]);

    return {
        providers,
        toggleProvider,
        updateMeshtasticSettings,
        meshtasticSettings: (settings as any).meshtastic || {},
        isPrivateMode: settings.privacyMode === 'local-only'
    };
}
