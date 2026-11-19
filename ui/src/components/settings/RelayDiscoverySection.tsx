import React, {useState, useEffect, useMemo} from 'react';
import {NetworkIcon, PlusIcon, RefreshCwIcon, ArrowPathIcon, SignalIcon, LinkIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {IconButton} from '../ui/Button';
import {Input} from '../ui/Input';
import {ConfirmationModal} from '../ui/Primitives';
import {useToast} from '../../hooks/useToast';
import type {AppSettings} from '@notention/core';
import {DEFAULT_RELAYS} from '@notention/core';

interface RelayDiscoverySectionProps {
    settings: AppSettings;
    setSettings: (updater: (settings: AppSettings) => AppSettings) => void;
}

export function RelayDiscoverySection({settings, setSettings}: RelayDiscoverySectionProps) {
    const {addToast} = useToast();
    const [newRelay, setNewRelay] = useState('');
    const [relayToRemove, setRelayToRemove] = useState<string | null>(null);
    const [discoveredRelays, setDiscoveredRelays] = useState<any[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [lastDiscovered, setLastDiscovered] = useState<number | null>(null);

    const currentRelays = settings.nostr.relays || DEFAULT_RELAYS;

    const loadDiscoveredRelays = async () => {
        try {
            const { createRelayDiscovery } = await import('@notention/core');
            const discovery = createRelayDiscovery({ maxRelays: 30 });
            const relays = await discovery.getBootstrapRelays();
            const discovered = await discovery.probeRelays(relays);
            setDiscoveredRelays(discovered);
            setLastDiscovered(Date.now());
        } catch (e) {
            console.warn('Failed to load discovered relays', e);
        }
    };

    useEffect(() => {
        loadDiscoveredRelays();
    }, []);

    const handleDiscoverRelays = async () => {
        setIsDiscovering(true);
        try {
            const { createRelayDiscovery } = await import('@notention/core');
            const discovery = createRelayDiscovery({ maxRelays: 30 });
            const relays = await discovery.getBootstrapRelays();
            const discovered = await discovery.probeRelays(relays);
            setDiscoveredRelays(discovered);
            setLastDiscovered(Date.now());
            addToast(`Discovered ${discovered.length} relays`, 'success');
        } catch (e) {
            addToast('Failed to discover relays', 'error');
        } finally {
            setIsDiscovering(false);
        }
    };

    const handleAddRelay = () => {
        if (!newRelay) return;
        let url = newRelay.trim();
        if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
            url = 'wss://' + url;
        }

        if (currentRelays.includes(url)) {
            addToast('Relay already exists.', 'warning');
            return;
        }

        setSettings(prev => ({
            ...prev,
            nostr: {
                ...prev.nostr,
                relays: [...(prev.nostr.relays || DEFAULT_RELAYS), url]
            }
        }));
        setNewRelay('');
        addToast('Relay added', 'success');
    };

    const handleRemoveRelayConfirm = () => {
        if (relayToRemove) {
            setSettings(prev => ({
                ...prev,
                nostr: {
                    ...prev.nostr,
                    relays: (prev.nostr.relays || DEFAULT_RELAYS).filter(r => r !== relayToRemove)
                }
            }));
            addToast('Relay removed', 'info');
            setRelayToRemove(null);
        }
    };

    const handleAddDiscoveredRelay = (url: string) => {
        if (currentRelays.includes(url)) {
            addToast('Relay already in your list.', 'warning');
            return;
        }

        setSettings(prev => ({
            ...prev,
            nostr: {
                ...prev.nostr,
                relays: [...(prev.nostr.relays || DEFAULT_RELAYS), url]
            }
        }));
        addToast('Discovered relay added', 'success');
    };

    const getHealthColor = (score?: number) => {
        if (!score) return 'text-gray-500';
        if (score > 0.7) return 'text-green-400';
        if (score > 0.4) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getHealthLabel = (score?: number) => {
        if (!score) return 'Unknown';
        if (score > 0.7) return 'Healthy';
        if (score > 0.4) return 'Degraded';
        return 'Unhealthy';
    };

    return (
        <div className="border-t border-gray-700 pt-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-3">
                <NetworkIcon className="h-6 w-6 text-purple-400"/>
                Relay Discovery
            </h2>
            <div className="space-y-4 max-w-lg">
                <p className="text-sm text-gray-400">
                    Discover and add Nostr relays from well-known lists. Relays are automatically sorted by health (latency + success rate).
                </p>

                <div className="flex gap-2 mb-4">
                    <Button
                        onClick={handleDiscoverRelays}
                        disabled={isDiscovering}
                        variant="secondary"
                        icon={<ArrowPathIcon className={isDiscovering ? 'animate-spin' : ''} />}
                    >
                        {isDiscovering ? 'Discovering...' : 'Discover Relays'}
                    </Button>
                    {lastDiscovered && (
                        <span className="flex items-center gap-1 text-sm text-gray-500 px-3 py-1.5 bg-gray-800 rounded-lg">
                            Last updated: {new Date(lastDiscovered).toLocaleTimeString()}
                        </span>
                    )}
                </div>

                {discoveredRelays.length > 0 && (
                    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                        <div className="px-4 py-3 border-b border-gray-700 bg-gray-900/50">
                            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <LinkIcon className="w-4 h-4" />
                                Discovered Relays ({discoveredRelays.length})
                            </h3>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {discoveredRelays.map((relay, idx) => {
                                const isConfigured = currentRelays.includes(relay.url);
                                const score = relay.healthScore ?? 0;
                                const latency = relay.latencyMs;
                                return (
                                    <div key={idx}
                                         className={`flex justify-between items-center px-4 py-3 border-b border-gray-700 last:border-0 hover:bg-gray-750 ${isConfigured ? 'bg-gray-900/50' : ''}`}>
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className={`font-mono text-sm truncate ${getHealthColor(relay.healthScore)}`}>{relay.url}</span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${getHealthColor(score)} bg-opacity-10`}>
                                                {getHealthLabel(score)} ({Math.round(score * 100)}%)
                                            </span>
                                            {latency && (
                                                <span className="text-[10px] text-gray-500 font-mono">
                                                    {latency}ms
                                                </span>
                                            )}
                                            {relay.source === 'builtin' && (
                                                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                    Built-in
                                                </span>
                                            )}
                                            {relay.source === 'user' && (
                                                <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                                    User
                                                </span>
                                            )}
                                            {relay.source === 'discovered' && (
                                                <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                                                    Discovered
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isConfigured ? (
                                                <span className="px-2 py-1 text-xs text-green-400 bg-green-500/10 rounded">
                                                    Added
                                                </span>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleAddDiscoveredRelay(relay.url)}
                                                    className="text-green-400 hover:text-green-300"
                                                >
                                                    Add
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <div className="px-4 py-3 border-b border-gray-700 bg-gray-900/50">
                        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <SignalIcon className="w-4 h-4" />
                            Your Relays ({currentRelays.length})
                        </h3>
                    </div>
                    {currentRelays.map((relay, idx) => (
                        <div key={idx}
                             className="flex justify-between items-center px-4 py-3 border-b border-gray-700 last:border-0 hover:bg-gray-750">
                            <span className="text-gray-300 text-sm font-mono truncate">{relay}</span>
                            <IconButton
                                onClick={() => setRelayToRemove(relay)}
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-red-400"
                                title="Remove Relay"
                                icon={<LinkIcon />}
                            />
                        </div>
                    ))}
                    {currentRelays.length === 0 && (
                        <div className="px-4 py-3 text-gray-500 text-sm italic">
                            No relays configured. Using defaults internally if not set.
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Input
                        value={newRelay}
                        onChange={(e) => setNewRelay(e.target.value)}
                        placeholder="wss://relay.example.com"
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddRelay()}
                    />
                    <Button
                        onClick={handleAddRelay}
                        disabled={!newRelay}
                        className="bg-purple-600 hover:bg-purple-500 text-white"
                        icon={PlusIcon}
                    >
                        Add Custom Relay
                    </Button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!relayToRemove}
                onClose={() => setRelayToRemove(null)}
                onConfirm={handleRemoveRelayConfirm}
                title="Remove Relay?"
                message={`Are you sure you want to remove ${relayToRemove} from your relay list?`}
                confirmLabel="Remove"
                isDestructive
            />
        </div>
    );
};