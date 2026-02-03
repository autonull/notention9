import React, { useEffect, useMemo, useState } from 'react';
import { finalizeEvent, nip19 } from 'nostr-tools';

import type { AppSettings, NostrProfile } from '@notention/core';
import { DEFAULT_RELAYS, formatNpub, hexToBytes, pool } from '@notention/core';
import { EditIcon } from '../common/icons';
import { Avatar } from '../common/Avatar';
import { IconButton } from '../common/IconButton';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Modal } from '../common/Modal';

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
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Display Name"
            placeholder="Display Name"
            value={profile.name || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, name: e.target.value }))
            }
          />
          <Input
            label="Picture URL"
            placeholder="Picture URL"
            value={profile.picture || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, picture: e.target.value }))
            }
          />
          <Textarea
            label="About"
            placeholder="About"
            value={profile.about || ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, about: e.target.value }))
            }
            className="h-24"
          />
          <div className="flex justify-end gap-4 mt-6">
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
              isLoading={isSaving}
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

      await Promise.all(pool.publish(DEFAULT_RELAYS, signedEvent));
      // Profile will be updated via the nostr subscription
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSavingProfile(false);
      setIsModalOpen(false);
    }
  };

  const handleCopy = () => navigator.clipboard.writeText(npub);

  return (
    <>
      <div className="flex-shrink-0 p-4 border-b border-gray-700/50 flex items-center gap-4 bg-gray-900/50">
        <Avatar
          src={myProfile?.picture}
          pubkey={pubkey}
          size="xl"
          className="border-2 border-gray-600"
        />
        <div className="flex-grow">
          <h2 className="text-xl font-bold text-white">
            {myProfile?.name || 'Anonymous'}
          </h2>
          <p
            className="text-sm text-gray-400 font-mono cursor-pointer hover:text-blue-400"
            onClick={handleCopy}
            title="Click to copy"
          >
            {formatNpub(npub)}
          </p>
          {myProfile?.about && (
            <p className="text-sm text-gray-300 mt-1">{myProfile.about}</p>
          )}
        </div>
        <IconButton
          onClick={() => setIsModalOpen(true)}
          icon={EditIcon}
          title="Edit Profile"
          variant="secondary"
        />
      </div>
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
