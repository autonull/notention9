import React, {useState, useEffect, useMemo} from 'react';
import {NetworkIcon, PlusIcon, TrashIcon, ArrowPathIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {IconButton} from '../ui/Button';
import {Input} from '../ui/Input';
import {ConfirmationModal} from '../ui/Primitives';
import {useToast} from '../../hooks/useToast';
import type {AppSettings} from '@notention/core';
import {DEFAULT_RELAYS} from '@notention/core';

interface RelayHealthInfo {
    url: string;
    score: number;
    latency: number;
    successRate: number;
    healthy: boolean;
    lastError?: string;
}

interface RelayManagementSectionProps {
    settings: AppSettings;
    setSettings: (updater: (settings: AppSettings) => AppSettings) => void;
}

export function RelayManagementSection({settings, setSettings}: RelayManagementSectionProps) {
    const {addToast} = useToast();
    const [newRelay, setNewRelay] = useState('');
    const [relayToRemove, setRelayToRemove] = useState<string | null>(null);
    const [relayHealth, setRelayHealth] = useState<Record<string, RelayHealthInfo>>({});
    const [testingRelay, setTestingRelay] = useState<string | null>(null);

    const currentRelays = useMemo(() => settings.nostr.relays || DEFAULT_RELAYS, [settings.nostr.relays]);

    // Load health data from core
    useEffect(() => {
        const loadHealth = async () => {
            try {
                const { nostrRelayHealth } = await import('@notention/core');
                const health: Record<string, RelayHealthInfo> = {};
                for (const url of currentRelays) {
                    health[url] = nostrRelayHealth.relayHealthManager.getStatus(url);
                }
                setRelayHealth(health);
            } catch (e) {
                console.warn('Failed to load relay health', e);
            }
        };
        loadHealth();
    }, [currentRelays]);

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

    const handleTestRelay = async (url: string) => {
        setTestingRelay(url);
        const { nostrRelayHealth } = await import('@notention/core');
        const start = Date.now();
        try {
            const ws = new WebSocket(url);
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('timeout'));
                }, 5000);
                ws.onopen = () => {
                    clearTimeout(timeout);
                    ws.close();
                    resolve();
                };
                ws.onerror = (e) => {
                    clearTimeout(timeout);
                    reject(e);
                };
            });
            const latency = Date.now() - start;
            nostrRelayHealth.relayHealthManager.recordConnect(url, latency, true);
            addToast(`${url} - Connected in ${latency}ms`, 'success');
            // Refresh health
            const health = nostrRelayHealth.relayHealthManager.getStatus(url);
            setRelayHealth(prev => ({ ...prev, [url]: health }));
        } catch (e) {
            const latency = Date.now() - start;
            nostrRelayHealth.relayHealthManager.recordConnect(url, latency, false, String(e));
            addToast(`${url} - Failed: ${String(e)}`, 'error');
            const health = nostrRelayHealth.relayHealthManager.getStatus(url);
            setRelayHealth(prev => ({ ...prev, [url]: health }));
        } finally {
            setTestingRelay(null);
        }
    };

    const getHealthColor = (score: number) => {
        if (score > 0.7) return 'text-green-400';
        if (score > 0.4) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getHealthLabel = (score: number) => {
        if (score > 0.7) return 'Healthy';
        if (score > 0.4) return 'Degraded';
        return 'Unhealthy';
    };

    return (
        <div className="border-t border-gray-700 pt-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-3">
                <NetworkIcon className="h-6 w-6 text-purple-400"/>
                Network Relays
            </h2>
            <div className="space-y-4 max-w-lg">
                <p className="text-sm text-gray-400">
                    Manage the relays you connect to. These servers store and broadcast your notes.
                    Relays are automatically sorted by health (latency + success rate) for publishing.
                </p>

                <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    {currentRelays.map((relay, idx) => {
                        const health = relayHealth[relay];
                        const score = health?.score ?? 0.5;
                        return (
                            <div key={idx}
                                 className="flex justify-between items-center px-4 py-3 border-b border-gray-700 last:border-0 hover:bg-gray-750">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className={`font-mono text-sm truncate ${getHealthColor(score)}`}>{relay}</span>
                                    {health && (
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${getHealthColor(score)} bg-opacity-10`}>
                                            {getHealthLabel(score)} ({Math.round(score * 100)}%)
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {health && (
                                        <>
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                {health.latency}ms / {health.successRate}% ok
                                            </span>
                                            <IconButton
                                                onClick={() => handleTestRelay(relay)}
                                                disabled={testingRelay === relay}
                                                variant="ghost"
                                                size="sm"
                                                className="text-gray-500 hover:text-blue-400"
                                                title="Test Relay"
                                                icon={ArrowPathIcon}
                                            />
                                        </>
                                    )}
                                    <IconButton
                                        onClick={() => setRelayToRemove(relay)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-gray-500 hover:text-red-400"
                                        title="Remove Relay"
                                        icon={TrashIcon}
                                    />
                                </div>
                            </div>
                        );
                    })}
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
                        Add
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
