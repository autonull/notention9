import React, { useState } from 'react';
import { NetworkIcon, PlusIcon, TrashIcon } from '../common/icons';
import { Button } from '../common/Button';
import { IconButton } from '../common/IconButton';
import { Input } from '../common/Input';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { useToast } from '../../hooks/useToast';
import { DEFAULT_RELAYS } from '@notention/core';
import type { AppSettings } from '@notention/core';

interface RelayManagementSectionProps {
    settings: AppSettings;
    setSettings: (updater: (settings: AppSettings) => AppSettings) => void;
}

export function RelayManagementSection({ settings, setSettings }: RelayManagementSectionProps) {
    const { addToast } = useToast();
    const [newRelay, setNewRelay] = useState('');
    const [relayToRemove, setRelayToRemove] = useState<string | null>(null);

    const currentRelays = settings.nostr.relays || DEFAULT_RELAYS;

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

    return (
        <div className="border-t border-gray-700 pt-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-3">
                <NetworkIcon className="h-6 w-6 text-purple-400" />
                Network Relays
            </h2>
            <div className="space-y-4 max-w-lg">
                <p className="text-sm text-gray-400">
                    Manage the relays you connect to. These servers store and broadcast your notes.
                </p>

                <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    {currentRelays.map((relay, idx) => (
                        <div key={idx} className="flex justify-between items-center px-4 py-3 border-b border-gray-700 last:border-0 hover:bg-gray-750">
                            <span className="text-gray-300 text-sm font-mono truncate">{relay}</span>
                            <IconButton
                                onClick={() => setRelayToRemove(relay)}
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-red-400"
                                title="Remove Relay"
                                icon={TrashIcon}
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
