import {useCallback} from 'react';
import {useToast} from './useToast';
import type {Note} from '@notention/core';

export const useEditorActions = (dirtyNote: Note) => {
    const {addToast} = useToast();

    const handleExport = useCallback(() => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dirtyNote, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${dirtyNote.title || 'untitled'}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        addToast('Note exported as JSON', 'success');
    }, [dirtyNote, addToast]);

    const handleCopyContent = useCallback(() => {
        navigator.clipboard.writeText(dirtyNote.content);
        addToast('Content copied to clipboard', 'success');
    }, [dirtyNote, addToast]);

    return {
        handleExport,
        handleCopyContent
    };
};
