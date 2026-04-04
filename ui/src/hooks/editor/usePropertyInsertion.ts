import {useCallback, useState} from 'react';
import type {Editor} from '@tiptap/react';
import type {OntologyAttribute, OntologyNode} from '@notention/core';

export function usePropertyInsertion() {
    // This hook is now largely simplified since we moved to inline editing.
    // Keeping it for backwards compatibility if needed, but it mostly just inserts a new property node.

    const handlePrepareNewProperty = (editor: Editor | null) => {
        if (editor) {
            editor.chain().focus().insertContent({
                type: 'property',
                attrs: {
                    name: '',
                    operator: 'is',
                    value: '',
                    isEditing: true
                }
            }).insertContent(' ').run();
        }
    };

    return {
        handlePrepareNewProperty
    };
}
