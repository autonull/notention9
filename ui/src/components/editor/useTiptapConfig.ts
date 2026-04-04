import {useEditor} from '@tiptap/react';
import {sanitizeHTML} from '../../utils/sanitize';
import {useOntologyIndex} from '../../hooks/index';
import type {Note, OntologyNode, Template, SuggestedAttribute} from '@notention/core';
import {useEffect, useMemo, useRef} from 'react';
import {getExtensions} from './extensions';

interface UseTiptapConfigProps {
    content: string;
    onUpdate: (content: string) => void;
    ontology: OntologyNode[];
    templates?: Template[];
    minimal?: boolean;
    notes?: Note[];
    onMagic?: () => void;
    suggestions?: SuggestedAttribute[];
}

export const useTiptapConfig = ({
                                    content,
                                    onUpdate,
                                    ontology,
                                    templates = [],
                                    minimal,
                                    notes = [],
                                    onMagic,
                                    suggestions = []
                                }: UseTiptapConfigProps) => {
    const {allTags, allProperties} = useOntologyIndex(ontology);

    const mergedProperties = useMemo(() => {
        const existingIds = new Set(allProperties.map(p => p.id));
        const learned = suggestions
            .filter(s => !existingIds.has(s.key))
            .map(s => ({
                id: s.key,
                label: s.key,
                description: `Learned (Freq: ${s.frequency})`
            }));
        return [...allProperties, ...learned];
    }, [allProperties, suggestions]);

    // Use ref to access latest notes in callbacks without re-initializing editor
    // Note: getExtensions is called inside useEditor, so it uses the current notesRef if passed correctly?
    // Actually useEditor dependencies array handles re-initialization.
    // But wait, useEditor doesn't update extensions dynamically well usually.
    // However, the original code used notesRef inside callbacks.
    // We need to pass the *ref* or a way to access current notes to getExtensions?
    // Or just pass notes and let the hook handle it?
    // The original code passed `notesRef.current` inside the callback functions defined in the extension configuration.

    const notesRef = useRef(notes);
    const propertiesRef = useRef(mergedProperties);
    const tagsRef = useRef(allTags);
    const templatesRef = useRef(templates);

    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    useEffect(() => {
        propertiesRef.current = mergedProperties;
    }, [mergedProperties]);

    useEffect(() => {
        tagsRef.current = allTags;
    }, [allTags]);

    useEffect(() => {
        templatesRef.current = templates;
    }, [templates]);

    const getNotes = () => notesRef.current;
    const getAllProperties = () => propertiesRef.current;
    const getAllTags = () => tagsRef.current;
    const getTemplates = () => templatesRef.current;

    return useEditor({
        extensions: getExtensions({
            getAllProperties,
            getAllTags,
            getNotes,
            getTemplates,
            onMagic
        }),
        content: sanitizeHTML(content),
        editorProps: {
            attributes: {
                class: `prose prose-invert focus:outline-none h-full max-w-none w-full ${minimal ? 'p-2 text-sm prose-sm' : 'prose-lg sm:prose-xl lg:prose-2xl p-6'}`,
            },
        },
        onUpdate: ({editor}) => onUpdate(editor.getHTML()),
    }, [minimal]);
};
