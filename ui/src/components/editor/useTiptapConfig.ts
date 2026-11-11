import {useEditor} from '@tiptap/react';
import {sanitizeHTML} from '../../utils/sanitize';
import {useOntologyIndex} from '../../hooks/useOntologyIndex';
import type {Note, OntologyNode, SuggestedAttribute, Template} from '@notention/core';
import {useEffect, useMemo, useRef} from 'react';
import {getExtensions} from './extensions';

interface UseTiptapConfigProps {
    content: string;
    onUpdate: (content: string) => void;
    ontology: OntologyNode[];
    templates?: Template[];
    minimal?: boolean;
    notes?: Note[];
    onOpenPropertyModal?: (key: string) => void;
    onMagic?: () => void;
    suggestions?: SuggestedAttribute[];
}

/**
 * Editor configuration.
 *
 * The editor instance is expensive to recreate (it loses focus and selection),
 * so everything the extensions read at runtime is passed as a getter over a
 * ref. Only `minimal` (which changes the editor chrome) recreates the editor.
 */
export const useTiptapConfig = ({
                                    content,
                                    onUpdate,
                                    ontology,
                                    templates = [],
                                    minimal,
                                    notes = [],
                                    onOpenPropertyModal,
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

    const propertiesRef = useRef(mergedProperties);
    const tagsRef = useRef(allTags);
    const templatesRef = useRef(templates);
    const notesRef = useRef(notes);
    const onUpdateRef = useRef(onUpdate);
    const openPropertyModalRef = useRef(onOpenPropertyModal);
    const magicRef = useRef(onMagic);

    useEffect(() => {
        propertiesRef.current = mergedProperties;
        tagsRef.current = allTags;
        templatesRef.current = templates;
        notesRef.current = notes;
        onUpdateRef.current = onUpdate;
        openPropertyModalRef.current = onOpenPropertyModal;
        magicRef.current = onMagic;
    });

    return useEditor({
        extensions: getExtensions({
            getProperties: () => propertiesRef.current,
            getTags: () => tagsRef.current,
            getNotes: () => notesRef.current,
            getTemplates: () => templatesRef.current,
            onOpenPropertyModal: key => openPropertyModalRef.current?.(key),
            onMagic: () => magicRef.current?.(),
        }),
        content: sanitizeHTML(content),
        editorProps: {
            attributes: {
                class: `prose prose-invert focus:outline-none h-full max-w-none w-full ${minimal ? 'p-2 text-sm prose-sm' : 'prose-lg sm:prose-xl lg:prose-2xl p-6'}`,
            },
        },
        onUpdate: ({editor}) => onUpdateRef.current(editor.getHTML()),
    }, [minimal]);
};
