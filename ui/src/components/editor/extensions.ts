import StarterKit from '@tiptap/starter-kit';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import Mention, {MentionNodeAttrs} from '@tiptap/extension-mention';
import {PropertyMark} from './PropertyMark';
import {GhostTextExtension} from './GhostTextExtension';
import {configureSuggestions} from './configureSuggestions';
import type {Note, Template} from '@notention/core';

interface GetExtensionsProps {
    getProperties: () => { id: string; label: string; description?: string }[];
    getTags: () => { id: string; label: string; description?: string }[];
    getNotes: () => Note[];
    getTemplates: () => Template[];
    onOpenPropertyModal?: (key: string) => void;
    onMagic?: () => void;
}

interface SlashCommandAttrs extends MentionNodeAttrs {
    type?: string;
}

const createMentionConfig = (name: string, className: string, trigger: string, resolver: (query: string) => any[], command?: any) =>
    Mention.configure({
        HTMLAttributes: { class: className },
        suggestion: { ...configureSuggestions(resolver, trigger), ...(command ? { command } : {}) } as any
    }).extend({ name });

export const getExtensions = ({
                                  getProperties,
                                  getTags,
                                  getNotes,
                                  getTemplates,
                                  onOpenPropertyModal,
                                  onMagic
                              }: GetExtensionsProps) => {
    const resolveProperties = (query: string) => {
        const lower = query.toLowerCase();
        return [...getProperties()]
            .sort((a, b) => (a.label.toLowerCase().startsWith(lower) ? -1 : 1))
            .filter(p => p.label.toLowerCase().includes(lower))
            .slice(0, 10)
            .map(p => ({ id: p.id, label: p.label, description: p.description }));
    };

    const resolveNotes = (query: string) => {
        const lower = query.toLowerCase();
        return getNotes()
            .filter(n => (n.title || 'Untitled').toLowerCase().includes(lower))
            .slice(0, 5)
            .map(n => ({ id: n.id, label: n.title || 'Untitled', description: 'Note' }));
    };

    return [
        StarterKit, BubbleMenu, PropertyMark, GhostTextExtension,
        createMentionConfig('propertySuggestion', 'suggestion-item', '[', resolveProperties, ({ editor, range, props }: any) => {
            editor.chain().focus().deleteRange(range).run();
            onOpenPropertyModal?.(props.label || '');
        }),
        createMentionConfig('tagSuggestion', 'suggestion-tag', '#', (query) => {
            const lower = query.toLowerCase();
            return getTags().filter(t => t.label.toLowerCase().includes(lower)).slice(0, 5)
                .map(t => ({ id: t.id, label: t.label, description: t.description }));
        }),
        createMentionConfig('noteSuggestion', 'suggestion-note', '@', resolveNotes),
        createMentionConfig('wikiLinkSuggestion', 'suggestion-note', '[[', resolveNotes, ({ editor, range, props }: any) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'noteSuggestion',
                attrs: { id: props.id, label: props.label }
            }).insertContent(' ').run();
        }),
        createMentionConfig('slashCommand', 'suggestion-slash', '/', (query) => {
            const lower = query.toLowerCase();
            const templateItems = getTemplates().filter(t => t.label.toLowerCase().includes(lower))
                .sort((a, b) => (a.label.toLowerCase().startsWith(lower) ? -1 : 1))
                .map(t => ({ id: t.content, label: t.label, description: 'Template', type: 'template' }));

            const propertyItems = getProperties().filter(p => p.label.toLowerCase().includes(lower))
                .map(p => ({ id: p.label, label: p.label, description: 'Detail', type: 'property' }));

            const commandItems = [];
            if ('magic align'.includes(lower)) commandItems.push({ id: 'magic', label: 'Magic Align', description: 'Auto-detect properties', type: 'command' });
            if ('current date'.includes(lower)) commandItems.push({ id: 'date', label: 'Current Date', description: new Date().toISOString().split('T')[0], type: 'command' });
            if ('current time'.includes(lower)) commandItems.push({ id: 'time', label: 'Current Time', description: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'command' });

            return [...commandItems, ...templateItems, ...propertyItems].slice(0, 10);
        }, ({ editor, range, props }: any) => {
            editor.chain().focus().deleteRange(range).run();
            const p = props as SlashCommandAttrs;
            if (p.type === 'property' && onOpenPropertyModal && p.label) return onOpenPropertyModal(p.label);
            if (p.type === 'command') {
                if (p.id === 'magic') onMagic?.();
                else if (p.id === 'date') editor.chain().focus().insertContent(new Date().toISOString().split('T')[0]).run();
                else if (p.id === 'time') editor.chain().focus().insertContent(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })).run();
                return;
            }
            editor.chain().focus().insertContent(p.id ?? '').run();
        }),
    ];
};
