import {useCallback, useState} from 'react';
import type {Note} from '@notention/core';
import {usePublish} from './usePublish';
import {useToast} from './useToast';

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

        if (validationErrors.length > 0) {
            addToast(`Cannot ${actionLabel}: ${validationErrors.join(', ')}`, 'error');
            return;
        }

        const confirmed = await promptUser();
        if (!confirmed) return;

        try {
            const eventId = await publishNote(dirtyNote, async () => true);
            const now = new Date().toISOString();
            const updatedNote = {
                ...dirtyNote,
                nostrEventId: eventId,
                publishedAt: now,
            };
            setDirtyNote(updatedNote);
            onSave(updatedNote);
            addToast(`${actionLabel} successful!`, 'success');
        } catch (e) {
            // If user cancelled privacy modal, it throws 'Publishing cancelled' or similar.
            // We might want to swallow that error or show it as info.
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('cancelled')) {
                // User cancelled, do nothing
                return;
            }
            addToast(
                'Failed to publish: ' + msg,
                'error'
            );
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
        privacyConfirmation,
        handlePrivacyConfirm,
        handlePrivacyCancel
    };
};
