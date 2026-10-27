import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    subscribe: (provider: NetworkProvider, getUpsertNote: () => ((note: Note, skipAgent?: boolean) => void) | undefined, settings: any) => void;
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
        subscribe: (provider, getUpsertNote) => {
            provider.on('note', (note: Note) => {
                const upsertNote = getUpsertNote();
                upsertNote?.(note, true);
            });
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
        subscribe: (provider, getUpsertNote, settings) => {
            provider.on('note', (note: Note) => {
                if (settings.meshtastic?.saveReceivedNotes) {
                    const upsertNote = getUpsertNote();
                    upsertNote?.(note, true);
                }
            });
            provider.on('error', (err: any) => console.error('Mesh error:', err));
        }
    }
};

export function useNetworkManagement() {
    const { settings, setSettings } = useSettings();
    const upsertNoteRef = useRef<((note: Note, skipAgent?: boolean) => void) | null>(null);
    
    // Update ref when notes context is available
    const { upsertNote } = useNotes();
    upsertNoteRef.current = upsertNote;
    
    const [providers, setProviders] = useState(() => networkRegistry.getAllProviders());

    const nostr = useMemo(() => networkRegistry.getProvider('nostr') as NostrNetworkProvider | null, [providers]);
    const mesh = useMemo(() => networkRegistry.getProvider('meshtastic') as MeshtasticNetworkProvider | null, [providers]);

    // Subscribe to events - use ref to get latest upsertNote
    useEventSubscription(nostr, {
        note: (note: Note) => {
            upsertNoteRef.current?.(note, true);
        }
    });
    useEventSubscription(mesh, {
        note: (note: Note) => {
            if (settings.meshtastic?.saveReceivedNotes) {
                upsertNoteRef.current?.(note, true);
            }
        },
        error: (err: any) => console.error('Mesh error:', err)
    });

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
