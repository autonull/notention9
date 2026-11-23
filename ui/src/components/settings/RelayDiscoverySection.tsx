import React, {useState, useEffect, useMemo} from 'react';
import {NetworkIcon, PlusIcon, ArrowPathIcon, SignalIcon, LinkIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {IconButton} from '../ui/Button';
import {Input} from '../ui/Input';
import {ConfirmationModal} from '../ui/Primitives';
import {SectionHeader} from '../ui/kit';
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
        if (!score) return 'text-[var(--app-muted)]';
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
        <div className="border-t border-[var(--app-line)] pt-6">
            <SectionHeader
                title="Relay discovery"
                description="Add well-known relays, sorted by health."
                icon={NetworkIcon}
            />
            <div className="space-y-4 max-w-lg">
                <p className="text-[12px] text-[var(--app-muted)]">
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
                        <span className="flex items-center gap-1 text-[12px] text-[var(--app-muted)] px-3 py-1.5 bg-[var(--app-raised)] rounded-lg">
                            Last updated: {new Date(lastDiscovered).toLocaleTimeString()}
                        </span>
                    )}
                </div>

                {discoveredRelays.length > 0 && (
                    <div className="bg-[var(--app-raised)] rounded-lg overflow-hidden border border-[var(--app-line)]">
                        <div className="px-4 py-3 border-b border-[var(--app-line)] bg-[var(--app-surface)]/50">
                            <h3 className="text-sm font-medium text-[var(--app-text-secondary)] flex items-center gap-2">
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
                                         className={`flex justify-between items-center px-4 py-3 border-b border-[var(--app-line)] last:border-0 hover:bg-[var(--app-hover)] ${isConfigured ? 'bg-[var(--app-surface)]/50' : ''}`}>
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className={`font-mono text-sm truncate ${getHealthColor(relay.healthScore)}`}>{relay.url}</span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${getHealthColor(score)} bg-opacity-10`}>
                                                {getHealthLabel(score)} ({Math.round(score * 100)}%)
                                            </span>
                                            {latency && (
                                                <span className="text-xs text-[var(--app-muted)] font-mono">
                                                    {latency}ms
                                                </span>
                                            )}
                                            {relay.source === 'builtin' && (
                                                <span className="text-xs text-[var(--app-accent-text)] bg-[var(--app-accent-soft)] px-1.5 py-0.5 rounded">
                                                    Built-in
                                                </span>
                                            )}
                                            {relay.source === 'user' && (
                                                <span className="text-xs text-[var(--app-accent-text)] bg-[var(--app-accent-soft)] px-1.5 py-0.5 rounded">
                                                    User
                                                </span>
                                            )}
                                            {relay.source === 'discovered' && (
                                                <span className="text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
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

                <div className="bg-[var(--app-raised)] rounded-lg overflow-hidden border border-[var(--app-line)]">
                    <div className="px-4 py-3 border-b border-[var(--app-line)] bg-[var(--app-surface)]/50">
                        <h3 className="text-sm font-medium text-[var(--app-text-secondary)] flex items-center gap-2">
                            <SignalIcon className="w-4 h-4" />
                            Your Relays ({currentRelays.length})
                        </h3>
                    </div>
                    {currentRelays.map((relay, idx) => (
                        <div key={idx}
                             className="flex justify-between items-center px-4 py-3 border-b border-[var(--app-line)] last:border-0 hover:bg-[var(--app-hover)]">
                            <span className="text-[var(--app-text-secondary)] text-sm font-mono truncate">{relay}</span>
                            <IconButton
                                onClick={() => setRelayToRemove(relay)}
                                variant="ghost"
                                size="sm"
                                className="text-[var(--app-muted)] hover:text-red-400"
                                title="Remove Relay"
                                icon={LinkIcon}
                            />
                        </div>
                    ))}
                    {currentRelays.length === 0 && (
                        <div className="px-4 py-3 text-[var(--app-muted)] text-sm italic">
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
                        className="bg-purple-600 hover:bg-purple-500 text-[var(--app-text)]"
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