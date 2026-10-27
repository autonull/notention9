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
            message="Are you sure you want to permanently delete this note? This action cannot be undone."
            confirmLabel="Delete Forever"
            isDestructive
        />
    );
}