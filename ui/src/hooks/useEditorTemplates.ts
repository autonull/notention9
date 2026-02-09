import {useCallback} from 'react';
import type {Note} from '@notention/core';
import {useSettings} from './useSettingsContext';
import {useToast} from './useToast';

interface UseEditorTemplatesProps {
    dirtyNote: Note;
}

export const useEditorTemplates = ({dirtyNote}: UseEditorTemplatesProps) => {
    const {setSettings} = useSettings();
    const {addToast} = useToast();

    const handleSaveTemplate = useCallback(
        (name: string) => {
            const template = {
                id: crypto.randomUUID(),
                label: name,
                content: dirtyNote.content,
                icon: '📄', // Default icon
            };

            setSettings((prev) => ({
                ...prev,
                customTemplates: [...prev.customTemplates, template],
            }));

            addToast(`Saved as template: ${name}`, 'success');
        },
        [dirtyNote.content, setSettings, addToast]
    );

    return {
        handleSaveTemplate,
    };
};
