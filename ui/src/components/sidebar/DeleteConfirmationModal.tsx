import React from 'react';
import {ConfirmationModal} from '../ui/Primitives';
import {useSidebar} from './SidebarContext';

export function DeleteConfirmationModal() {
    const { isDeleteModalOpen, setIsDeleteModalOpen, handleDeleteConfirmed } = useSidebar();

    return (
        <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDeleteConfirmed}
            title="Permanently Delete Note"
            message="Permanently delete this note? This cannot be undone. If it was published, a NIP-09 deletion request is sent to relays, which may ignore it."
            confirmLabel="Delete Forever"
            isDestructive
        />
    );
}