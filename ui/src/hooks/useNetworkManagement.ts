import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    networkRegistry,
    NostrNetworkProvider,
    MeshtasticNetworkProvider,
    NetworkProvider,
    Note
} from '@notention/core';
import { useSettings } from './useSettingsContext';
import { useNotes } from './useNotes';
import { agentService } from '../services/AgentService';
import { useEventSubscription } from './useEventSubscription';

interface ProviderConfig {
    id: string;
    create: (settings: any) => NetworkProvider;
    update: (provider: NetworkProvider, settings: any) => void;
    subscribe: (provider: NetworkProvider, handlers: any) => void;
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
    nostr: {
        id: 'nostr',
        create: (settings) => new NostrNetworkProvider({
            privkey: settings.nostr?.privkey,
            relays: settings.nostr?.relays,
            enabled: settings.privacyMode !== 'local-only'
        }),
        update: (provider, settings) => {
            provider.setConfig({
                privkey: settings.nostr?.privkey,
                relays: settings.nostr?.relays,
                enabled: settings.privacyMode !== 'local-only'
            });
        },
        subscribe: (provider, { upsertNote }) => {
            provider.on('note', (note: Note) => upsertNote(note, true));
        }
    },
    meshtastic: {
        id: 'meshtastic',
        create: (settings) => new MeshtasticNetworkProvider({
            enabled: settings.privacyMode !== 'local-only' && settings.meshtastic?.enabled,
            connectionType: settings.meshtastic?.connectionType,
            saveReceivedNotes: settings.meshtastic?.saveReceivedNotes,
            agentService
        }),
        update: (provider, settings) => {
            provider.setConfig({
                enabled: settings.privacyMode !== 'local-only' && settings.meshtastic?.enabled,
                connectionType: settings.meshtastic?.connectionType,
                saveReceivedNotes: settings.meshtastic?.saveReceivedNotes
            });
        },
        subscribe: (provider, { upsertNote }, settings) => {
            provider.on('note', (note: Note) => {
                if (settings.meshtastic?.saveReceivedNotes) {
                    upsertNote(note, true);
                }
            });
            provider.on('error', (err: any) => console.error('Mesh error:', err));
        }
    }
};

export function useNetworkManagement() {
    const { settings, setSettings } = useSettings();
    const { upsertNote } = useNotes();
    const [providers, setProviders] = useState(() => networkRegistry.getAllProviders());

    const nostr = useMemo(() => networkRegistry.getProvider('nostr') as NostrNetworkProvider | null, [providers]);
    const mesh = useMemo(() => networkRegistry.getProvider('meshtastic') as MeshtasticNetworkProvider | null, [providers]);

    // Subscribe to events
    useEventSubscription(nostr, PROVIDER_CONFIGS.nostr.subscribe({ upsertNote }));
    useEventSubscription(mesh, PROVIDER_CONFIGS.meshtastic.subscribe({ upsertNote }, settings));

    // Initialize/update providers
    useEffect(() => {
        Object.entries(PROVIDER_CONFIGS).forEach(([id, config]) => {
            let provider = networkRegistry.getProvider(id);
            if (!provider) {
                provider = config.create(settings);
                networkRegistry.registerProvider(provider);
                provider.initialize();
            } else {
                config.update(provider, settings);
            }
        });
        setProviders(networkRegistry.getAllProviders());
    }, [settings]);

    // Handle privacy mode
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
            if (id === 'meshtastic') {
                setSettings((prev) => ({
                    ...prev,
                    meshtastic: { ...(prev.meshtastic || {}), enabled }
                }));
            }
            setProviders([...networkRegistry.getAllProviders()]);
        }
    }, [setSettings]);

    const updateProviderSettings = useCallback((id: string, updates: any) => {
        setSettings((prev) => ({
            ...prev,
            [id]: { ...(prev[id] || {}), ...updates }
        }));
    }, [setSettings]);

    return {
        providers,
        toggleProvider,
        updateProviderSettings,
        meshtasticSettings: settings.meshtastic || {},
        nostrSettings: settings.nostr || {},
        isPrivateMode: settings.privacyMode === 'local-only'
    };
}
