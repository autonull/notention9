import React, { useState } from 'react';
import { Note, publishNoteToNostr } from '@notention/core';
import { Button } from '../common/Button';
import { useSettings } from '../../hooks/useSettingsContext';

interface PublishPanelProps {
    note: Note;
    onUpdate: (note: Note) => void;
}

export const PublishPanel: React.FC<PublishPanelProps> = ({ note, onUpdate }) => {
    const { settings } = useSettings();
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTogglePrivacy = () => {
        onUpdate({
            ...note,
            public: !note.public
        });
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        setError(null);
        try {
            await publishNoteToNostr(note, settings.nostr.privkey || undefined);
            // Success feedback?
        } catch (e: any) {
            setError(e.message || 'Publish failed');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="p-3 bg-gray-900 border-b border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${note.public ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className="text-xs font-medium text-gray-300">
                        {note.public ? 'Public Note' : 'Private Note'}
                    </span>
                </div>

                <Button
                    size="xs"
                    variant={note.public ? "secondary" : "ghost"}
                    onClick={handleTogglePrivacy}
                >
                    {note.public ? 'Make Private' : 'Make Public'}
                </Button>
            </div>

            {note.public && (
                <div className="pt-2 border-t border-gray-800">
                    <div className="text-[10px] text-gray-500 mb-2">
                        Visible to any relay.
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
                    {error && (
                        <div className="text-xs text-red-400 mt-2">
                            {error}
                        </div>
                    )}

                    {note.nostrEventId && (
                        <div className="text-[10px] text-green-500 mt-2 truncate">
                            Published: {note.nostrEventId}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
