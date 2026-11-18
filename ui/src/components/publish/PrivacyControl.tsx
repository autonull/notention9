import React, {useMemo, useState} from 'react';
import {Note, PrivacyLevel, getPIIStats, publishDeletionRequest, publishNoteToNostr, redactPIIForTransport} from '@notention/core';
import {useSettings} from '../../hooks/useSettingsContext';
import {LockIcon, ShieldIcon, WorldIcon} from '../ui/icons';
import {Button} from '../ui/Button';

interface PrivacyControlProps {
    note: Note;
    onUpdate: (note: Note) => void;
}

const PREVIEW_LENGTH = 220;

export function PrivacyControl({note, onUpdate}: PrivacyControlProps) {
    const {settings} = useSettings();
    const [pendingPrivacy, setPendingPrivacy] = useState<PrivacyLevel | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [redactPII, setRedactPII] = useState(true);
    const [requestDeletion, setRequestDeletion] = useState(true);

    const privacy = note.privacy || 'private';

    const piiStats = useMemo(() => getPIIStats(note.content), [note.content]);
    const piiCount = piiStats.email + piiStats.phone + piiStats.ssn;
    const publishedContent = redactPII && piiCount > 0 ? redactPIIForTransport(note.content) : note.content;
    const publishedPreview = publishedContent.length > PREVIEW_LENGTH
        ? `${publishedContent.slice(0, PREVIEW_LENGTH)}…`
        : publishedContent;
    const relays = settings.nostr.relays ?? [];

    const requestPrivacy = (level: PrivacyLevel) => {
        if (level === privacy) return;
        setPublishError(null);
        setRedactPII(true);
        setRequestDeletion(true);
        setPendingPrivacy(level);
    };

    const updatePrivacy = (level: PrivacyLevel) => {
        onUpdate({...note, privacy: level});
    };

    const confirmPrivacyChange = async () => {
        if (!pendingPrivacy) return;

        const newPrivacy = pendingPrivacy;
        setPendingPrivacy(null);

        if (newPrivacy !== 'public') {
            updatePrivacy('private');

            if (requestDeletion && note.nostrEventId) {
                setIsPublishing(true);
                try {
                    await publishDeletionRequest(
                        note,
                        settings.nostr.privkey || undefined,
                        relays.length > 0 ? relays : undefined,
                    );
                } catch (e) {
                    setPublishError(e instanceof Error ? e.message : String(e));
                } finally {
                    setIsPublishing(false);
                }
            }
            return;
        }

        const updatedNote: Note = {...note, privacy: 'public'};
        onUpdate(updatedNote);

        setIsPublishing(true);
        setPublishError(null);
        try {
            await publishNoteToNostr(
                updatedNote,
                settings.nostr.privkey || undefined,
                relays.length > 0 ? relays : undefined,
                undefined,
                'public',
                undefined,
                {redactPII: redactPII && piiCount > 0},
            );
            onUpdate({...updatedNote});
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            setPublishError(message);
            updatePrivacy('private');
        } finally {
            setIsPublishing(false);
        }
    };

    const getIcon = (level: PrivacyLevel) =>
        level === 'private'
            ? <LockIcon className="w-3 h-3"/>
            : <WorldIcon className="w-3 h-3"/>;

    const getLabel = (level: PrivacyLevel) =>
        level === 'private' ? 'Private' : 'Public';

    return (
        <div className="relative flex items-center">
            <div className="flex bg-gray-800/50 rounded-lg border border-gray-700/50 p-0.5">
                {(['private', 'public'] as PrivacyLevel[]).map(level => (
                    <button
                        key={level}
                        onClick={() => requestPrivacy(level)}
                        aria-pressed={privacy === level}
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

            {isPublishing && (
                <div className="absolute -bottom-4 right-0 text-[9px] text-blue-400 animate-pulse whitespace-nowrap">
                    Publishing...
                </div>
            )}

            {pendingPrivacy && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                            {getIcon(pendingPrivacy)}
                            {pendingPrivacy === 'public' ? 'Publish publicly?' : 'Make private?'}
                        </h3>

                        {pendingPrivacy === 'public' ? (
                            <>
                                <div className="text-[11px] text-gray-300 bg-gray-900/60 border border-gray-700 rounded p-2 mb-3 max-h-32 overflow-auto whitespace-pre-wrap">
                                    {publishedPreview || <span className="text-gray-500">(empty note)</span>}
                                </div>

                                <ul className="text-[10px] text-gray-400 space-y-1 mb-3">
                                    <li>{note.properties.length} propert{note.properties.length === 1 ? 'y' : 'ies'} become public tags</li>
                                    <li>
                                        {relays.length > 0 ? `Sends to ${relays.length} relays` : 'Sends to the default relays'}
                                    </li>
                                    <li>Published notes are permanent; deletion is a best-effort NIP-09 request</li>
                                </ul>

                                <label className="flex items-center gap-2 text-[10px] text-gray-300 mb-3">
                                    <input
                                        type="checkbox"
                                        checked={redactPII}
                                        onChange={(e) => setRedactPII(e.target.checked)}
                                    />
                                    <ShieldIcon className="w-3 h-3"/>
                                    <span>
                                        Redact PII
                                        {piiCount > 0 ? ` (${piiCount} detected)` : ' (none detected)'}
                                    </span>
                                </label>
                            </>
                        ) : (
                            <>
                                <p className="text-[11px] text-gray-300 mb-3">
                                    The note stays on this device. Copies already published are not removed
                                    unless relays honor a deletion request.
                                </p>

                                {note.nostrEventId && (
                                    <label className="flex items-center gap-2 text-[10px] text-gray-300 mb-3">
                                        <input
                                            type="checkbox"
                                            checked={requestDeletion}
                                            onChange={(e) => setRequestDeletion(e.target.checked)}
                                        />
                                        <span>Request deletion from relays (NIP-09)</span>
                                    </label>
                                )}
                            </>
                        )}

                        {publishError && (
                            <p className="text-[10px] text-red-400 mb-2">{publishError}</p>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button size="xs" variant="ghost" onClick={() => setPendingPrivacy(null)}>Cancel</Button>
                            <Button size="xs" onClick={confirmPrivacyChange}>
                                {pendingPrivacy === 'public' ? 'Publish' : 'Make private'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
