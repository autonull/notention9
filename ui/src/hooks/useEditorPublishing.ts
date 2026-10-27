import {useCallback, useState} from 'react';
import type {Note} from '@notention/core';
import {usePublish} from './usePublish';
import {useToast} from './useToast';
import {emitActionTrace} from '@notention/core';

interface UseEditorPublishingProps {
    dirtyNote: Note;
    setDirtyNote: (note: Note | ((prev: Note) => Note)) => void;
    onSave: (note: Note) => void;
    validationErrors: string[];
    actionLabel: string;
}

export function useEditorPublishing({
                                         dirtyNote,
                                         setDirtyNote,
                                         onSave,
                                         validationErrors,
                                         actionLabel,
                                     }: UseEditorPublishingProps) {
    const {publishNote, isPublishing} = usePublish();
    const {addToast} = useToast();
    const [publishError, setPublishError] = useState<string | null>(null);

    const [privacyConfirmation, setPrivacyConfirmation] = useState<{
        isOpen: boolean;
        resolve: (value: boolean) => void;
    } | null>(null);

    const promptUser = useCallback(() => {
        return new Promise<boolean>((resolve) => {
            setPrivacyConfirmation({
                isOpen: true,
                resolve,
            });
        });
    }, []);

    const handlePrivacyConfirm = useCallback(() => {
        if (privacyConfirmation) {
            privacyConfirmation.resolve(true);
            setPrivacyConfirmation(null);
        }
    }, [privacyConfirmation]);

    const handlePrivacyCancel = useCallback(() => {
        if (privacyConfirmation) {
            privacyConfirmation.resolve(false);
            setPrivacyConfirmation(null);
        }
    }, [privacyConfirmation]);

    const handlePublish = useCallback(async () => {
        if (!dirtyNote.content) return;

        setPublishError(null);

        if (validationErrors.length > 0) {
            addToast(`Cannot ${actionLabel}: ${validationErrors.join(', ')}`, 'error');
            return;
        }

        const confirmed = await promptUser();
        if (!confirmed) {
            emitActionTrace({
                source: 'ui',
                intent: 'note.publish',
                confirmations: [{ action: 'publish', outcome: 'cancelled' }],
                outcome: 'requires_confirmation',
            });
            return;
        }

        emitActionTrace({
            source: 'ui',
            intent: 'note.publish',
            confirmations: [{ action: 'publish', outcome: 'requested' }],
            outcome: 'requires_confirmation',
        });

        // The disclosure preview is the consent step: publishing transmits the note,
        // so a private note becomes public before it leaves the device.
        const publishableNote: Note = dirtyNote.privacy === 'public'
            ? dirtyNote
            : {...dirtyNote, privacy: 'public'};

        try {
            const eventId = await publishNote(publishableNote, async () => true);
            const now = new Date().toISOString();
            const updatedNote = {
                ...publishableNote,
                nostrEventId: eventId ?? publishableNote.id,
                publishedAt: now,
            };
            setDirtyNote(updatedNote);
            onSave(updatedNote);
            addToast(`${actionLabel} successful!`, 'success');

            emitActionTrace({
                source: 'ui',
                intent: 'note.publish',
                confirmations: [{ action: 'publish', outcome: 'granted' }],
                stateChanges: [{ path: 'privacy', from: dirtyNote.privacy, to: 'public' }],
                outcome: 'ok',
            });
        } catch (e) {
            // If user cancelled privacy modal, it throws 'Publishing cancelled' or similar.
            // We might want to swallow that error or show it as info.
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('cancelled')) {
                emitActionTrace({
                    source: 'ui',
                    intent: 'note.publish',
                    confirmations: [{ action: 'publish', outcome: 'cancelled' }],
                    outcome: 'requires_confirmation',
                });
                return;
            }
            setPublishError(msg);
            addToast(
                'Failed to publish: ' + msg,
                'error'
            );

            emitActionTrace({
                source: 'ui',
                intent: 'note.publish',
                outcome: 'failed',
            });
        }
    }, [
        dirtyNote,
        validationErrors,
        actionLabel,
        publishNote,
        promptUser,
        setDirtyNote,
        onSave,
        addToast,
    ]);

    return {
        handlePublish,
        isPublishing,
        publishError,
        privacyConfirmation,
        handlePrivacyConfirm,
        handlePrivacyCancel
    };
};