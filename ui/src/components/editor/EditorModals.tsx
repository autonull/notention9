/**
 * EditorModals - All editor-related modals
 * Extracted from EditorManager for separation of concerns
 */
import React from 'react';
import {SaveTemplateModal} from './SaveTemplateModal';
import {MapPickerModal} from '../map/MapPickerModal';
import {TimePickerModal} from '../ui/Primitives';
import {PrivacyConfirmModal} from '../modals/PrivacyConfirmModal';
import type {Note} from '@notention/core';

interface EditorModalsProps {
    isSaveTemplateModalOpen: boolean;
    onSaveTemplateModalClose: () => void;
    onSaveTemplate: (name: string) => void;
    isMapPickerOpen: boolean;
    onMapPickerClose: () => void;
    onLocationSelect: (location: string) => void;
    isTimePickerOpen: boolean;
    onTimePickerClose: () => void;
    onTimeSelect: (time: string) => void;
    pickingTimeKey: string;
    privacyConfirmation: {
        isOpen: boolean;
        onClose: () => void;
        onConfirm: () => void;
    } | null;
    onPrivacyConfirm: () => void;
    onPrivacyCancel: () => void;
    dirtyNote: Note;
}

export function EditorModals({
    isSaveTemplateModalOpen,
    onSaveTemplateModalClose,
    onSaveTemplate,
    isMapPickerOpen,
    onMapPickerClose,
    onLocationSelect,
    isTimePickerOpen,
    onTimePickerClose,
    onTimeSelect,
    pickingTimeKey,
    privacyConfirmation,
    onPrivacyConfirm,
    onPrivacyCancel,
    dirtyNote,
}: EditorModalsProps) {
    return (
        <>
            <SaveTemplateModal
                isOpen={isSaveTemplateModalOpen}
                onClose={onSaveTemplateModalClose}
                onSave={onSaveTemplate}
            />
            <MapPickerModal
                isOpen={isMapPickerOpen}
                onClose={onMapPickerClose}
                onLocationSelect={onLocationSelect}
            />
            <TimePickerModal
                isOpen={isTimePickerOpen}
                onClose={onTimePickerClose}
                onTimeSelect={onTimeSelect}
                title={`Pick Time for ${pickingTimeKey}`}
            />
            {privacyConfirmation && (
                <PrivacyConfirmModal
                    isOpen={privacyConfirmation.isOpen}
                    onClose={onPrivacyCancel}
                    onConfirm={onPrivacyConfirm}
                    noteTitle={dirtyNote.title}
                    destination="Nostr network"
                    note={dirtyNote}
                />
            )}
        </>
    );
}