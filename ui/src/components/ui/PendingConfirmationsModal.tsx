import React, {useEffect} from 'react';
import {ConfirmationModal} from './ConfirmationModal';
import {usePendingConfirmations} from '../../hooks/usePendingConfirmations';

export function PendingConfirmationsModal() {
    const {pendingConfirmations, removePendingConfirmation} = usePendingConfirmations();

    // Publishing has a dedicated disclosure in the editor (content, tags, raw event).
    // Keep the pending state for traces, but do not stack a second generic modal on top.
    const current = pendingConfirmations.find(confirmation => confirmation.action !== 'publish') ?? null;

    const handleConfirm = () => {
        if (current) {
            removePendingConfirmation(current.action);
            window.dispatchEvent(new CustomEvent('confirmation-granted', {
                detail: {action: current.action, consequence: current.consequence}
            }));
        }
    };

    const handleCancel = () => {
        if (current) {
            removePendingConfirmation(current.action);
            window.dispatchEvent(new CustomEvent('confirmation-cancelled', {
                detail: {action: current.action, consequence: current.consequence}
            }));
        }
    };

    return (
        <>
            {current && (
                <ConfirmationModal
                    isOpen={true}
                    onClose={handleCancel}
                    onConfirm={handleConfirm}
                    title={`Confirm ${current.action.charAt(0).toUpperCase() + current.action.slice(1)}`}
                    message={current.consequence}
                    confirmLabel="Confirm"
                    cancelLabel="Cancel"
                    isDestructive={current.action === 'delete' || current.action === 'publish'}
                />
            )}
        </>
    );
}