import {useCallback, useState} from 'react';
import type {Note} from '@notention/core';
import {usePublish} from '../network/usePublish';
import {useToast} from '../useToast';

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

        // We removed the generic confirm() in favor of NetworkGate's specific check
        // OR we might still want a general confirm?
        // The previous code had `confirm('Are you sure...')`.
        // If the note is ALREADY public, NetworkGate won't trigger promptUser.
        // So we lose the "Are you sure" check for public notes if we remove this.
        // However, the promptUser is specifically for PRIVACY.
        // Let's keep a generic confirm if the note is already public?
        // Or just rely on the user clicking "Publish". Usually "Publish" actions are significant.
        // For now, I will KEEP the generic confirm BUT rely on Privacy Modal for the privacy escalation.
        // Actually, `confirm()` is ugly. Let's trust the button click for Public notes,
        // and only show modal for Private notes.

        try {
            const eventId = await publishNote(dirtyNote, promptUser);
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
