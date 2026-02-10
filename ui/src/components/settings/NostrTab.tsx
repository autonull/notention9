import React, {useMemo, useState} from 'react';
import {generateSecretKey, getPublicKey, nip19} from 'nostr-tools';
import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js';
import {KeyIcon, UserPlusIcon} from '../common/icons';
import type {AppSettings} from '@notention/core';
import {Logger} from '@notention/core';
import {CopyableField} from '../common/CopyableField';
import {usePublish} from '@/hooks/usePublish';
import {useToast} from '../../hooks/useToast';
import {Input} from '../common/Input';
import {Button} from '../common/Button';
import {Textarea} from '../common/Textarea';
import {ConfirmationModal} from '../common/ConfirmationModal';
import {RelayManagementSection} from './RelayManagementSection';

interface NostrTabProps {
    settings: AppSettings;
    setSettings: (updater: (settings: AppSettings) => AppSettings) => void;
}

export function NostrTab({
                             settings,
                             setSettings,
                         }: NostrTabProps) {
    const {publishProfile, isPublishing} = usePublish();
    const {addToast} = useToast();

    // Local state for profile form
    const [name, setName] = useState('');
    const [about, setAbout] = useState('');
    const [picture, setPicture] = useState('');

    // Local state for import
    const [importKey, setImportKey] = useState('');
    const [importError, setImportError] = useState<string | null>(null);

    // Modals state
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleGenerateKeys = () => {
        const newPrivKeyHex = bytesToHex(generateSecretKey());
        setSettings((prev) => ({...prev, nostr: {...prev.nostr, privkey: newPrivKeyHex}}));
        addToast('New keys generated', 'success');
    };

    const handleImportKey = () => {
        setImportError(null);
        const key = importKey.trim();
        if (!key) return;

        try {
            if (key.startsWith('nsec')) {
                const {type, data} = nip19.decode(key);
                if (type !== 'nsec') {
                    setImportError('Invalid key type. Must be an nsec.');
                    return;
                }
                const hex = bytesToHex(data as Uint8Array);
                setSettings((prev) => ({...prev, nostr: {...prev.nostr, privkey: hex}}));
            } else {
                // Assume Hex
                if (!/^[0-9a-fA-F]{64}$/.test(key)) {
                    setImportError('Invalid hex private key. Must be 64 characters.');
                    return;
                }
                setSettings((prev) => ({...prev, nostr: {...prev.nostr, privkey: key.toLowerCase()}}));
            }
            setImportKey('');
            addToast('Key imported successfully', 'success');
        } catch (e) {
            setImportError('Invalid key format.');
            Logger.getInstance().error("Key import failed", e instanceof Error ? e : new Error(String(e)));
        }
    };

    const handleLogout = () => {
        setSettings((prev) => ({...prev, nostr: {...prev.nostr, privkey: null}}));
        addToast('Logged out', 'info');
    };

    const handleSaveProfile = async () => {
        try {
            await publishProfile({name, about, picture});
            addToast('Profile published to network!', 'success');
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            addToast('Failed to publish profile: ' + message, 'error');
        }
    };

    const {npub, nsec} = useMemo(() => {
        if (!settings.nostr.privkey) return {npub: null, nsec: null};
        try {
            const pubkey = getPublicKey(hexToBytes(settings.nostr.privkey));
            return {
                npub: nip19.npubEncode(pubkey),
                nsec: nip19.nsecEncode(hexToBytes(settings.nostr.privkey)),
            };
        } catch (e) {
            Logger.getInstance().error('Error encoding keys:', e instanceof Error ? e : new Error(String(e)));
            return {npub: 'Error', nsec: 'Error'};
        }
    }, [settings.nostr.privkey]);

    return (
        <div className="bg-gray-900/70 p-6 rounded-lg animate-fade-in space-y-8">

            {/* Identity Section */}
            <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-3">
                    <KeyIcon className="h-6 w-6 text-yellow-400"/>
                    Nostr Identity
                </h2>
                {settings.nostr.privkey && nsec && npub ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">
                            Your keys are stored locally on this device. Keep your private key
                            safe and do not share it.
                        </p>
                        <CopyableField label="Public Key (npub)" value={npub}/>
                        <CopyableField label="Private Key (nsec)" value={nsec} isSecret/>
                        <Button
                            onClick={() => setShowLogoutConfirm(true)}
                            variant="danger"
                            className="w-full mt-4"
                            icon={KeyIcon}
                        >
                            Log Out & Clear Private Key
                        </Button>
                    </div>
                ) : (
                    <div className="text-center py-6 space-y-6">
                        <div className="space-y-2">
                            <p className="text-gray-400">
                                New to Nostr? Generate a fresh identity.
                            </p>
                            <Button
                                onClick={handleGenerateKeys}
                                variant="primary"
                                className="mx-auto"
                                icon={KeyIcon}
                            >
                                Generate New Keys
                            </Button>
                        </div>

                        <div className="border-t border-gray-700/50 w-1/2 mx-auto"></div>

                        <div className="max-w-md mx-auto space-y-2">
                            <p className="text-gray-400 text-sm">
                                Already have an account? Import your private key.
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    value={importKey}
                                    onChange={(e) => setImportKey(e.target.value)}
                                    placeholder="nsec1... or hex key"
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleImportKey}
                                    variant="secondary"
                                >
                                    Import
                                </Button>
                            </div>
                            {importError && (
                                <p className="text-red-400 text-xs text-left">{importError}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Relay Management Section */}
            <RelayManagementSection settings={settings} setSettings={setSettings}/>

            {/* Profile Section */}
            {settings.nostr.privkey && (
                <div className="border-t border-gray-700 pt-6">
                    <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-3">
                        <UserPlusIcon className="h-6 w-6 text-blue-400"/>
                        Public Profile
                    </h2>
                    <div className="space-y-4 max-w-lg">
                        <div>
                            <Input
                                label="Name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Alice"
                            />
                        </div>
                        <div>
                            <Textarea
                                label="About"
                                value={about}
                                onChange={e => setAbout(e.target.value)}
                                placeholder="I'm a developer building cool things."
                                rows={4}
                            />
                        </div>
                        <div>
                            <Input
                                label="Picture URL"
                                value={picture}
                                onChange={e => setPicture(e.target.value)}
                                placeholder="https://example.com/avatar.png"
                            />
                        </div>
                        <Button
                            onClick={handleSaveProfile}
                            disabled={isPublishing}
                            isLoading={isPublishing}
                            variant="primary"
                        >
                            {isPublishing ? 'Publishing...' : 'Publish Profile'}
                        </Button>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Log Out?"
                message="Are you sure? This will remove your Nostr private key from this device. This action cannot be undone."
                confirmLabel="Log Out"
                isDestructive
            />
        </div>
    );
};
