import React, {useEffect, useMemo, useState} from 'react';
import {finalizeEvent, nip19} from 'nostr-tools';

import type {AppSettings, NostrProfile} from '@notention/core';
import {formatNpub, hexToBytes, Logger, pool, resolveRelays} from '@notention/core';
import {EditIcon} from '../ui/icons';
import {Avatar} from '../ui/Avatar';
import {IconButton} from '../ui/Button';
import {Button} from '../ui/Button';
import {Input} from '../ui/Input';
import {Textarea} from '../ui/Textarea';
import {Modal} from '../ui/Modal';
import {IdentityStrip} from '../patterns/IdentityStrip';
import {RelayStatusChip} from './RelayStatusChip';

interface ProfileEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (profile: NostrProfile) => Promise<void>;
    initialProfile: NostrProfile;
    isSaving: boolean;
}

function ProfileEditorModal({
                                isOpen,
                                onClose,
                                onSave,
                                initialProfile,
                                isSaving,
                            }: ProfileEditorModalProps) {
    const [profile, setProfile] = useState(initialProfile);

    useEffect(() => setProfile(initialProfile), [initialProfile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(profile);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit profile">
            <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                    label="Display name"
                    placeholder="Display name"
                    value={profile.name || ''}
                    onChange={(e) =>
                        setProfile((p) => ({...p, name: e.target.value}))
                    }
                />
                <Input
                    label="Picture URL"
                    placeholder="Picture URL"
                    value={profile.picture || ''}
                    onChange={(e) =>
                        setProfile((p) => ({...p, picture: e.target.value}))
                    }
                />
                <Textarea
                    label="About"
                    placeholder="About"
                    value={profile.about || ''}
                    onChange={(e) =>
                        setProfile((p) => ({...p, about: e.target.value}))
                    }
                    className="h-24"
                />
                <div className="flex justify-end gap-2 pt-3">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="secondary"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSaving}
                        loading={isSaving}
                        variant="primary"
                    >
                        Save
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export function ProfileHeader({
                                  settings,
                                  pubkey,
                                  profileCache,
                              }: {
    settings: AppSettings;
    pubkey: string;
    profileCache: Record<string, NostrProfile>;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const myProfile = profileCache[pubkey] || null;
    const npub = useMemo(() => nip19.npubEncode(pubkey), [pubkey]);

    const handleSaveProfile = async (profile: NostrProfile) => {
        if (!settings.nostr.privkey) return;
        setIsSavingProfile(true);
        try {
            const privkeyUI8A = hexToBytes(settings.nostr.privkey);
            const eventTemplate = {
                kind: 0,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: JSON.stringify(profile),
            };
            const signedEvent = finalizeEvent(eventTemplate, privkeyUI8A);

            await Promise.all(pool.publish(resolveRelays(settings.nostr.relays), signedEvent));
            // Profile will be updated via the nostr subscription
        } catch (error) {
            Logger.getInstance().error('Failed to save profile:', error instanceof Error ? error : new Error(String(error)));
        } finally {
            setIsSavingProfile(false);
            setIsModalOpen(false);
        }
    };

    return (
        <>
            <IdentityStrip
                avatar={
                    <Avatar
                        src={myProfile?.picture}
                        pubkey={pubkey}
                        size="md"
                        className="border border-[var(--app-line)]"
                    />
                }
                name={myProfile?.name || 'Anonymous'}
                handle={
                    <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(npub)}
                        title="Copy npub"
                        className="min-w-0 max-w-[16rem] truncate font-mono text-[11px] text-[var(--app-faint)] transition-colors hover:text-[var(--app-text-secondary)]"
                    >
                        {formatNpub(npub)}
                    </button>
                }
                chips={<RelayStatusChip relays={settings.nostr.relays}/>}
                actions={
                    <IconButton
                        onClick={() => setIsModalOpen(true)}
                        icon={EditIcon}
                        title="Edit profile"
                        variant="ghost"
                        size="sm"
                    />
                }
            />
            <ProfileEditorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveProfile}
                initialProfile={myProfile || {}}
                isSaving={isSavingProfile}
            />
        </>
    );
}
