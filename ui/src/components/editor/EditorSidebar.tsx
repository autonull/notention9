/**
 * EditorSidebar - Assistant sidebar with SmartNoteAssistant
 * Extracted from EditorManager for separation of concerns
 */
import React from 'react';
import {SmartNoteAssistant} from '../SmartNoteAssistant';
import {cn} from '../../utils/ui';
import type {Note} from '@notention/core';

interface EditorSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    note: Note;
    onNoteUpdate: (content: string) => void;
    properties: Note['properties'];
    onUpdateProperty: (key: string, value: string) => void;
    onPickLocation: () => void;
    onPickTime: (key: string) => void;
    ontology: OntologyNode[];
}

export function EditorSidebar({
    isOpen,
    onClose,
    note,
    onNoteUpdate,
    properties,
    onUpdateProperty,
    onPickLocation,
    onPickTime,
    ontology,
}: EditorSidebarProps) {
    const sidebarClass = cn(
        'flex flex-col h-full bg-gray-900 border-l border-gray-700/50',
        'transition-all duration-300 ease-in-out transform',
        'fixed inset-y-0 right-0 z-30 shadow-2xl lg:shadow-none lg:z-0 lg:relative',
        'w-80 max-w-[85vw]',
        isOpen
            ? 'translate-x-0'
            : 'translate-x-full lg:w-0 lg:translate-x-0 lg:border-l-0 lg:overflow-hidden'
    );

    return (
        <div className={sidebarClass}>
            <SmartNoteAssistant
                note={note}
                onNoteUpdate={onNoteUpdate}
                className="h-full border-none rounded-none bg-transparent"
                properties={properties}
                onUpdateProperty={onUpdateProperty}
                onPickLocation={onPickLocation}
                onPickTime={onPickTime}
                ontology={ontology}
            />
        </div>
    );
}