import React, {useState} from 'react';
import {Note, PrivacyLevel, publishNoteToNostr} from '@notention/core';
import {useSettings} from '../../hooks/useSettingsContext';
import {LockIcon, UserGroupIcon, WorldIcon} from '../common/icons';
import {Button} from '../common/Button';

interface PrivacyControlProps {
    note: Note;
    onUpdate: (note: Note) => void;
}

export const PrivacyControl: React.FC<PrivacyControlProps> = ({note, onUpdate}) => {
    const {settings} = useSettings();
    const [pendingPrivacy, setPendingPrivacy] = useState<PrivacyLevel | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);

    const privacy = note.privacy || 'private';

    const handleSetPrivacy = (level: PrivacyLevel) => {
        // Always confirm privacy changes
        setPendingPrivacy(level);
    };

    const confirmPrivacyChange = async () => {
        if (pendingPrivacy) {
            // Optimistically update
            const newPrivacy = pendingPrivacy;
            setPendingPrivacy(null);

            const updatedNote = {...note, privacy: newPrivacy};
            onUpdate(updatedNote);

            // If becoming Public, auto-publish
            if (newPrivacy === 'public') {
                setIsPublishing(true);
                try {
                    const relays = settings.nostr.relays && settings.nostr.relays.length > 0
                        ? settings.nostr.relays
                        : undefined;

                    await publishNoteToNostr(updatedNote, settings.nostr.privkey || undefined, relays, undefined, 'public');

                    // The note is updated in-place by publishNoteToNostr with eventId/publishedAt
                    // We should propagate that back up
                    onUpdate({...updatedNote});
                } catch (e) {
                    console.error("Auto-publish failed", e);
                    // Revert? Or just show error? For now just log.
                } finally {
                    setIsPublishing(false);
                }
            }
        }
    };

    const updatePrivacy = (level: PrivacyLevel) => {
        onUpdate({
            ...note,
            privacy: level
        });
    };

    const getIcon = (level: PrivacyLevel) => {
        switch (level) {
            case 'private':
                return <LockIcon className="w-3 h-3"/>;
            case 'protected':
                return <UserGroupIcon className="w-3 h-3"/>;
            case 'public':
                return <WorldIcon className="w-3 h-3"/>;
        }
    };

    const getLabel = (level: PrivacyLevel) => {
        switch (level) {
            case 'private':
                return 'Private';
            case 'protected':
                return 'Semi';
            case 'public':
                return 'Public';
        }
    };

    return (
        <div className="relative flex flex-col items-end">
            <button
                onClick={() => handleSetPrivacy(privacy === 'private' ? 'public' : 'private')}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all border
                    ${privacy === 'public'
                    ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30 hover:bg-[#10b981]/20'
                    : 'bg-transparent text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-gray-300'}
                `}
                title={privacy === 'public' ? 'Make Private' : 'Make Public'}
            >
                {privacy === 'public' ? <span>🌐</span> : <span>🔒</span>}
                <span>{privacy === 'public' ? 'Published' : 'Private'}</span>
            </button>

            {/* Loading Indicator for Auto-Publish */}
            {isPublishing && (
                <div className="absolute -bottom-6 right-0 text-xs text-blue-400 animate-pulse whitespace-nowrap">
                    Publishing...
                </div>
            )}

            {/* Confirmation Modal (Portal or Absolute Overlay) */}
            {pendingPrivacy && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div
                        className="bg-[#1e293b] p-6 rounded-xl shadow-2xl border border-gray-700/50 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-white mb-4">
                            {pendingPrivacy === 'public' ? 'Publish this note?' : 'Make note private?'}
                        </h3>
                        <div className="text-sm text-gray-300 space-y-4 mb-6 leading-relaxed">
                            {pendingPrivacy === 'public' ? (
                                <>
                                    <p>Your note will be visible to anyone on the Nostr network. It will be signed with your cryptographic identity.</p>
                                    <p>You can make it private again at any time.</p>
                                </>
                            ) : (
                                <>
                                    <p>Your note will no longer be broadcasted to the Nostr network for matching.</p>
                                    <p>Note: Events already sent to relays cannot be easily deleted and may still be visible to others.</p>
                                </>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                className={`flex-1 px-4 py-2 text-white rounded-md font-medium transition-colors ${
                                    pendingPrivacy === 'public' ? 'bg-[#10b981] hover:bg-[#059669]' : 'bg-red-500 hover:bg-red-600'
                                }`}
                                onClick={confirmPrivacyChange}
                            >
                                {pendingPrivacy === 'public' ? 'Publish' : 'Make Private'}
                            </button>
                            <button
                                className="flex-1 px-4 py-2 bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 rounded-md font-medium transition-colors"
                                onClick={() => setPendingPrivacy(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
