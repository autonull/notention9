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
        const levels = {private: 0, protected: 1, public: 2};
        // If escalating (Private -> Public/Protected, or Protected -> Public), confirm
        if (levels[level] > levels[privacy]) {
            setPendingPrivacy(level);
        } else {
            updatePrivacy(level);
        }
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
        <div className="relative flex items-center">
            <div className="flex bg-gray-800/50 rounded-lg border border-gray-700/50 p-0.5">
                {(['private', 'protected', 'public'] as PrivacyLevel[]).map(level => (
                    <button
                        key={level}
                        onClick={() => handleSetPrivacy(level)}
                        className={`
                            flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all
                            ${privacy === level
                            ? 'bg-gray-700 text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'}
                        `}
                        title={`Set to ${level}`}
                    >
                        {getIcon(level)}
                        <span className="hidden xl:inline">{getLabel(level)}</span>
                    </button>
                ))}
            </div>

            {/* Loading Indicator for Auto-Publish */}
            {isPublishing && (
                <div className="absolute -bottom-4 right-0 text-[9px] text-blue-400 animate-pulse whitespace-nowrap">
                    Publishing...
                </div>
            )}

            {/* Confirmation Modal (Portal or Absolute Overlay) */}
            {pendingPrivacy && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div
                        className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700 max-w-xs w-full animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                            {getIcon(pendingPrivacy)}
                            Make {pendingPrivacy}?
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">
                            {pendingPrivacy === 'public'
                                ? "This will publish the note to the network immediately."
                                : "This increases visibility to specific groups."}
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button size="xs" variant="ghost" onClick={() => setPendingPrivacy(null)}>Cancel</Button>
                            <Button size="xs" onClick={confirmPrivacyChange}>Confirm</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
