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
    const { settings, setSettings } = useSettings() as { settings: any, setSettings: any };
    const { upsertNote } = useNotes();
    const [providers, setProviders] = useState(() => networkRegistry.getAllProviders());

    // Nostr Provider Effects
    useEffect(() => {
        const nostr = networkRegistry.getProvider('nostr') as NostrNetworkProvider;
        if (nostr) {
            const handleNote = (note: Note) => {
                upsertNote(note, true); // Always skipAgent for incoming network notes
            };
            nostr.on('note', handleNote);
            return () => nostr.off('note', handleNote);
        }
    }, [upsertNote]);

    // Meshtastic Provider Effects
    useEffect(() => {
        const mesh = networkRegistry.getProvider('meshtastic') as MeshtasticNetworkProvider;
        if (mesh) {
            const handleNote = (note: Note) => {
                if (settings.meshtastic?.saveReceivedNotes) {
                    upsertNote(note, true);
                }
            };

            const handleError = (err: any) => {
                console.error('Mesh error:', err);
            };

            mesh.on('note', handleNote);
            mesh.on('error', handleError);

            return () => {
                mesh.off('note', handleNote);
                mesh.off('error', handleError);
            };
        }
    }, [upsertNote, settings.meshtastic?.saveReceivedNotes]);

    useEffect(() => {
        let nostr = networkRegistry.getProvider('nostr') as NostrNetworkProvider;
        if (!nostr) {
            nostr = new NostrNetworkProvider({
                privkey: settings.nostr?.privkey,
                relays: settings.nostr?.relays,
                enabled: settings.privacyMode !== 'local-only'
            });
            networkRegistry.registerProvider(nostr);
            nostr.initialize();
        } else {
            nostr.setConfig({
                privkey: settings.nostr?.privkey,
                relays: settings.nostr?.relays,
                enabled: settings.privacyMode !== 'local-only'
            });
        }

        let mesh = networkRegistry.getProvider('meshtastic') as MeshtasticNetworkProvider;
        if (!mesh) {
            mesh = new MeshtasticNetworkProvider({
                enabled: settings.privacyMode !== 'local-only' && settings.meshtastic?.enabled,
                connectionType: settings.meshtastic?.connectionType,
                saveReceivedNotes: settings.meshtastic?.saveReceivedNotes,
                agentService: agentService
            });
            networkRegistry.registerProvider(mesh);
            mesh.initialize();
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

    const updateNostrSettings = useCallback((updates: any) => {
        setSettings((prev: any) => ({
            ...prev,
            nostr: {
                ...(prev.nostr || {}),
                ...updates
            }
        }));
    }, [setSettings]);

    return {
        providers,
        toggleProvider,
        updateMeshtasticSettings,
        updateNostrSettings,
        meshtasticSettings: settings.meshtastic || {},
        nostrSettings: settings.nostr || {},
        isPrivateMode: settings.privacyMode === 'local-only'
    };
}
