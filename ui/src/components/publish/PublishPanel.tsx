import React, {useState} from 'react';
import {Note, PrivacyLevel, publishNoteToNostr} from '@notention/core';
import {Button} from '../common/Button';
import {useSettings} from '../../hooks/useSettingsContext';
import {LockIcon, UserGroupIcon, WorldIcon} from '../common/icons';

interface PublishPanelProps {
    note: Note;
    onUpdate: (note: Note) => void;
}

export function PublishPanel({note, onUpdate}: PublishPanelProps) {
    const {settings} = useSettings();
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingPrivacy, setPendingPrivacy] = useState<PrivacyLevel | null>(null);

    const privacy = note.privacy || 'private';

    const handleSetPrivacy = (level: PrivacyLevel) => {
        // Confirmation for escalation
        const levels = {private: 0, protected: 1, public: 2};
        if (levels[level] > levels[privacy]) {
            setPendingPrivacy(level);
        } else {
            updatePrivacy(level);
        }
    };

    const confirmPrivacyChange = () => {
        if (pendingPrivacy) {
            updatePrivacy(pendingPrivacy);
            setPendingPrivacy(null);
        }
    };

    const updatePrivacy = (level: PrivacyLevel) => {
        onUpdate({
            ...note,
            privacy: level
        });
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        setError(null);
        try {
            const relays = settings.nostr.relays && settings.nostr.relays.length > 0
                ? settings.nostr.relays
                : undefined;

            await publishNoteToNostr(note, settings.nostr.privkey || undefined, relays, undefined, note.privacy);

            onUpdate({
                ...note,
                nostrEventId: note.nostrEventId,
                publishedAt: note.publishedAt
            });
        } catch (e: any) {
            setError(e.message || 'Publish failed');
        } finally {
            setIsPublishing(false);
        }
    };

    const renderPrivacyOption = (level: PrivacyLevel, icon: React.ReactNode, label: string) => {
        const isActive = privacy === level;
        return (
            <button
                onClick={() => handleSetPrivacy(level)}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all ${
                    isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
            >
                <div className="mb-1">{icon}</div>
                <span className="text-[10px] font-medium">{label}</span>
            </button>
        );
    };

    return (
        <div className="p-3 bg-gray-900 border-b border-gray-800 space-y-3">
            {/* 3-State Privacy Widget */}
            <div className="bg-gray-950 p-1 rounded-lg flex justify-between gap-1 border border-gray-800">
                {renderPrivacyOption('private', <LockIcon className="w-4 h-4"/>, 'Private')}
                {renderPrivacyOption('protected', <UserGroupIcon className="w-4 h-4"/>, 'Semi-Public')}
                {renderPrivacyOption('public', <WorldIcon className="w-4 h-4"/>, 'Public')}
            </div>

            {/* Confirmation Overlay */}
            {pendingPrivacy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-white mb-2">Change Privacy?</h3>
                        <p className="text-sm text-gray-300 mb-4">
                            You are increasing the visibility of this note to <strong>{pendingPrivacy}</strong>.
                            This may make it visible to others.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setPendingPrivacy(null)}>Cancel</Button>
                            <Button onClick={confirmPrivacyChange}>Confirm</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Publish Action */}
            {privacy !== 'private' && (
                <div className="pt-2 border-t border-gray-800">
                    <div className="text-[10px] text-gray-500 mb-2">
                        {privacy === 'public' ? 'Visible to everyone on the network.' : 'Visible to specific groups/encrypted.'}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            className="w-full justify-center"
                            onClick={handlePublish}
                            disabled={isPublishing}
                        >
                            {isPublishing ? 'Publishing...' : '📡 Publish to Network'}
                        </Button>
                    </div>
                    {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
                    {note.nostrEventId && (
                        <div className="text-[10px] text-green-500 mt-2 truncate">
                            Published: {note.nostrEventId}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
