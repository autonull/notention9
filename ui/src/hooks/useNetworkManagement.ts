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

    useEffect(() => {
        const mesh = networkRegistry.getProvider('meshtastic') as MeshtasticNetworkProvider;
        if (mesh) {
            const handleNote = (note: Note) => {
                if (settings.meshtastic?.saveReceivedNotes) {
                    upsertNote(note, { skipAgent: true });
                }
            };

            const handleError = (err: any) => {
                console.error('Mesh error:', err);
            };

            const handleTelemetry = async ({ nodeId, telemetry }: any) => {
                if (settings.meshtastic?.saveReceivedNotes) {
                    const provider = networkRegistry.getProvider('meshtastic') as MeshtasticNetworkProvider;
                    const note = provider.mapTelemetryToNote(nodeId, telemetry);
                    upsertNote(note, { skipAgent: true });
                }
            };

            const handlePosition = async ({ nodeId, position }: any) => {
                if (settings.meshtastic?.saveReceivedNotes) {
                    const provider = networkRegistry.getProvider('meshtastic') as MeshtasticNetworkProvider;
                    const note = provider.mapPositionToNote(nodeId, position);
                    upsertNote(note, { skipAgent: true });
                }
            };

            mesh.on('note', handleNote);
            mesh.on('telemetry', handleTelemetry);
            mesh.on('position', handlePosition);
            mesh.on('error', handleError);

            return () => {
                mesh.off('note', handleNote);
                mesh.off('telemetry', handleTelemetry);
                mesh.off('position', handlePosition);
                mesh.off('error', handleError);
            };
        }
    }, [upsertNote, settings.meshtastic?.saveReceivedNotes]);

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
                enabled: settings.privacyMode !== 'local-only' && settings.meshtastic?.enabled,
                connectionType: settings.meshtastic?.connectionType,
                saveReceivedNotes: settings.meshtastic?.saveReceivedNotes,
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
