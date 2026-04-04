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

    // The `getExtensions` function returns the array. If we call it here, we pass the *current* values.
    // If `notes` changes, we might want to update the extension.
    // But useEditor usually only runs once unless dependencies change.
    // The dependency array `[ontology, minimal, onOpenPropertyModal]` does NOT include `notes`.
    // So `notesRef` was used to get fresh notes without re-creating the editor.

    // My `getExtensions` implementation takes `notes` as an array.
    // If `notes` are stale in the closure, suggestions will be stale.
    // We need to preserve the "ref" behavior or include notes in dependencies.
    // Including notes in dependencies might cause editor to reload on every keystroke/save if notes change often.
    // But strictly speaking, the suggestions configuration needs access to the *latest* notes.

    // Let's modify `getExtensions` to accept a stable getter or similar?
    // Or just rely on re-rendering?
    // If I look at `extensions.ts`, it uses `notes` directly.

    // Wait, in `extensions.ts`:
    // return notes.filter(...)

    // This means `notes` is captured by closure when `getExtensions` is called.
    // If `useTiptapConfig` only calls `getExtensions` once (because of useEditor deps), then `notes` will be stale.

    // I should probably pass `notesRef.current` to `getExtensions`? No, because `getExtensions` is called at render time.
    // The original code defined the callbacks *inline*, so they closed over `notesRef`.

    // To keep the ref pattern, `getExtensions` should accept `notesRef`.
    // But `extensions.ts` shouldn't depend on React.
    // I can pass a `getNotes` function.

    const notesRef = useRef(notes);
    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    // We need to pass a way to get notes to extensions.ts
    // Let's modify extensions.ts to take `() => Note[]` or similar?
    // Or just accept that we need to re-create extensions when notes change?
    // Re-creating extensions might be expensive or cause editor reset.

    // Let's verify how useEditor behaves.
    // If I change extensions, does it break state?
    // "The editor is re-created when the dependencies change."
    // If we add `notes` to deps, the editor re-creates on every note save (since notes list updates).
    // That is bad (cursor jumps, etc).

    // So we MUST use the Ref pattern.
    // I will modify `extensions.ts` to accept `notes` as `Note[] | (() => Note[])`?
    // Or simpler: just pass `notes` as `Note[]` but assume it's a reference?
    // Arrays are references, but `notes` is likely a new array on every render.

    // I will modify `getExtensions` to take `getNotes: () => Note[]`.

    const getNotes = () => notesRef.current;

    return useEditor({
        extensions: getExtensions({
            allProperties: mergedProperties,
            allTags,
            getNotes, // Changed this
            templates,
            onMagic
        }),
        content: sanitizeHTML(content),
        editorProps: {
            attributes: {
                class: `prose prose-invert focus:outline-none h-full max-w-none w-full ${minimal ? 'p-2 text-sm prose-sm' : 'prose-lg sm:prose-xl lg:prose-2xl p-6'}`,
            },
        },
        onUpdate: ({editor}) => onUpdate(editor.getHTML()),
    }, [ontology, minimal, suggestions]);
};
