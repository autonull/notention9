import React, {useEffect} from 'react';
import {ConfirmationModal} from './ConfirmationModal';
import {usePendingConfirmations} from '../../hooks/usePendingConfirmations';

export function PendingConfirmationsModal() {
    const {pendingConfirmations, removePendingConfirmation} = usePendingConfirmations();

    const current = pendingConfirmations[0];

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