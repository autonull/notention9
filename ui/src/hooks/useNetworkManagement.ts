import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    networkRegistry,
    NostrNetworkProvider,
    MeshtasticNetworkProvider,
    NetworkProvider,
    Note,
    AppSettings,
    type SyncResult,
} from '@notention/core';
import { useSettings } from './useSettingsContext';
import { useNotes } from './useNotes';
import { agentService } from '../services/AgentService';
import { useEventSubscription } from './useEventSubscription';

interface NostrConfig {
    privkey?: string | null;
    relays?: string[];
    enabled?: boolean;
}

interface MeshtasticConfig {
    enabled?: boolean;
    connectionType?: 'webserial' | 'http' | 'server-proxy';
    saveReceivedNotes?: boolean;
}

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
            (provider as NostrNetworkProvider).setConfig({
                privkey: settings.nostr?.privkey,
                relays: settings.nostr?.relays,
                enabled: settings.privacyMode !== 'local-only'
            });
            // Update sync budget configuration
            (provider as NostrNetworkProvider).updateSyncBudget(settings);
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
            (provider as MeshtasticNetworkProvider).setConfig({
                enabled: settings.privacyMode !== 'local-only' && settings.meshtastic?.enabled,
                connectionType: settings.meshtastic?.connectionType,
                saveReceivedNotes: settings.meshtastic?.saveReceivedNotes
            } as Partial<MeshtasticConfig>);
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
    
    const [providers, setProviders] = useState(() => networkRegistry.getAllProviders().filter(Boolean));

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
        // Filter out any undefined values defensively
        setProviders(networkRegistry.getAllProviders().filter(Boolean));
    }, [settings]);

    // Handle privacy mode
    useEffect(() => {
        const isPrivate = settings.privacyMode === 'local-only';
        networkRegistry.getAllProviders().forEach(p => {
            if (p) {
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

    const updateProviderSettings = useCallback((id: 'nostr' | 'meshtastic', updates: any) => {
        setSettings((prev) => ({
            ...prev,
            [id]: { ...(prev[id] || {}), ...updates }
        }));
    }, [setSettings]);

    const setPrivacyMode = useCallback((mode: 'local-only' | 'shared') => {
        setSettings((prev) => ({ ...prev, privacyMode: mode }));
    }, [setSettings]);

    const syncNow = useCallback(async (): Promise<SyncResult> => {
        if (!nostr) {
            return {
                synced: false,
                eventsPublished: 0,
                eventsReceived: 0,
                payloadBytes: 0,
                durationMs: 0,
                isDelta: true,
                error: 'Nostr provider not available',
            };
        }
        return await nostr.sync(settings);
    }, [nostr, settings]);

    const fullSync = useCallback(async (): Promise<SyncResult> => {
        if (!nostr) {
            return {
                synced: false,
                eventsPublished: 0,
                eventsReceived: 0,
                payloadBytes: 0,
                durationMs: 0,
                isDelta: false,
                error: 'Nostr provider not available',
            };
        }
        return await nostr.fullSync(settings);
    }, [nostr, settings]);

    const getSyncBudgetStatus = useCallback(() => {
        if (!nostr) return null;
        return nostr.getSyncBudgetStatus(settings);
    }, [nostr, settings]);

    const getSyncMetrics = useCallback(() => {
        if (!nostr) return null;
        return nostr.getSyncMetrics(settings);
    }, [nostr, settings]);

    const updateSyncSettings = useCallback((updates: Partial<AppSettings['sync']>) => {
        setSettings((prev) => ({
            ...prev,
            sync: { ...(prev.sync || {}), ...updates },
        }));
    }, [setSettings]);

    return {
        providers,
        toggleProvider,
        updateProviderSettings,
        setPrivacyMode,
        syncNow,
        fullSync,
        getSyncBudgetStatus,
        getSyncMetrics,
        updateSyncSettings,
        meshtasticSettings: settings.meshtastic || {},
        nostrSettings: settings.nostr || {},
        syncSettings: settings.sync || {},
        isPrivateMode: settings.privacyMode === 'local-only'
    };
}
