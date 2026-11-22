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
            <div className="flex items-center rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-0.5">
                {(['private', 'public'] as PrivacyLevel[]).map(level => (
                    <button
                        key={level}
                        onClick={() => requestPrivacy(level)}
                        aria-pressed={privacy === level}
                        className={`
                            flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-colors
                            ${privacy === level
                            ? 'bg-[var(--app-raised)] text-[var(--app-text)]'
                            : 'text-[var(--app-muted)] hover:text-[var(--app-text-secondary)]'}
                        `}
                        title={`Set to ${level}`}
                    >
                        {getIcon(level)}
                        <span className="hidden xl:inline">{getLabel(level)}</span>
                    </button>
                ))}
            </div>

            {isPublishing && (
                <div className="absolute -bottom-4 right-0 whitespace-nowrap text-[11px] text-[var(--app-accent-text)] animate-pulse">
                    Publishing…
                </div>
            )}

            {pendingPrivacy && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-xl border border-[var(--app-line)] bg-[var(--app-panel)] p-4 shadow-[var(--app-shadow)] animate-scale-in">
                        <h3 className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-[var(--app-text)]">
                            {getIcon(pendingPrivacy)}
                            {pendingPrivacy === 'public' ? 'Publish publicly?' : 'Make private?'}
                        </h3>

                        {pendingPrivacy === 'public' ? (
                            <>
                                <div className="mb-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--app-line)] bg-[var(--app-bg)] p-2 text-[12px] text-[var(--app-text-secondary)]">
                                    {publishedPreview || <span className="text-[var(--app-faint)]">(empty note)</span>}
                                </div>

                                <ul className="mb-3 space-y-1 text-[12px] text-[var(--app-muted)]">
                                    <li>{note.properties.length} propert{note.properties.length === 1 ? 'y' : 'ies'} become public tags</li>
                                    <li>
                                        {relays.length > 0 ? `Sends to ${relays.length} relays` : 'Sends to the default relays'}
                                    </li>
                                    <li>Published notes are permanent; deletion is a best-effort NIP-09 request</li>
                                </ul>

                                <label className="mb-3 flex items-center gap-2 text-[12px] text-[var(--app-text-secondary)]">
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
                                <p className="mb-3 text-[12px] text-[var(--app-muted)]">
                                    The note stays on this device. Copies already published are not removed
                                    unless relays honor a deletion request.
                                </p>

                                {note.nostrEventId && (
                                    <label className="mb-3 flex items-center gap-2 text-[12px] text-[var(--app-text-secondary)]">
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
                            <p className="mb-2 text-[12px] text-red-400">{publishError}</p>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setPendingPrivacy(null)}>Cancel</Button>
                            <Button size="sm" onClick={confirmPrivacyChange}>
                                {pendingPrivacy === 'public' ? 'Publish' : 'Make private'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
