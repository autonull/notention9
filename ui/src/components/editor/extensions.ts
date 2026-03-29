import StarterKit from '@tiptap/starter-kit';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import Mention, {MentionNodeAttrs} from '@tiptap/extension-mention';
import {PropertyExtension} from './PropertyExtension';
import {GhostTextExtension} from './GhostTextExtension';
import {configureSuggestions} from './configureSuggestions';
import type {Note, Template} from '@notention/core';

interface GetExtensionsProps {
    allProperties: { id: string; label: string; description?: string }[];
    allTags: { id: string; label: string; description?: string }[];
    getNotes: () => Note[];
    templates: Template[];
    onOpenPropertyModal?: (key: string) => void;
    onMagic?: () => void;
}

// Extend default MentionNodeAttrs to include our custom type
interface SlashCommandAttrs extends MentionNodeAttrs {
    type?: string;
}

export const getExtensions = ({
                                  allProperties,
                                  allTags,
                                  getNotes,
                                  templates,
                                  onOpenPropertyModal,
                                  onMagic
                              }: GetExtensionsProps) => {
    return [
        StarterKit,
        BubbleMenu,
        PropertyExtension,
        GhostTextExtension,
        Mention.configure({
            HTMLAttributes: {
                class: 'suggestion-item',
            },
            suggestion: {
                ...configureSuggestions((query) => {
                    const lower = query.toLowerCase();
                    // Prioritize exact matches
                    const sorted = [...allProperties].sort((a, b) => {
                        const aStart = a.label.toLowerCase().startsWith(lower);
                        const bStart = b.label.toLowerCase().startsWith(lower);
                        if (aStart && !bStart) return -1;
                        if (!aStart && bStart) return 1;
                        return 0;
                    });

                    return sorted
                        .filter(p => p.label.toLowerCase().includes(lower))
                        .slice(0, 10) // Show more suggestions
                        .map(p => ({id: p.id, label: p.label, description: p.description}));
                }, '['),
                command: ({editor, range, props}) => {
                    // Delete the trigger and query
                    editor.chain().focus().deleteRange(range).run();

                    // Open modal if available to complete the property
                    if (onOpenPropertyModal) {
                        onOpenPropertyModal(props.label || '');
                    } else {
                        // Fallback: insert partial property and let user type
                        // We use a text insertion here, not a node, to allow smooth typing
                        editor.chain().focus().insertContent(`[${props.label}:is:]`).run();
                    }
                }
            }
        }).extend({name: 'propertySuggestion'}),

        Mention.configure({
            HTMLAttributes: {
                class: 'suggestion-tag',
            },
            suggestion: configureSuggestions((query) => {
                const lower = query.toLowerCase();
                return allTags
                    .filter(t => t.label.toLowerCase().includes(lower))
                    .slice(0, 5)
                    .map(t => ({id: t.id, label: t.label, description: t.description}));
            }, '#'),
        }).extend({name: 'tagSuggestion'}),

        Mention.configure({
            HTMLAttributes: {
                class: 'suggestion-note',
            },
            suggestion: configureSuggestions((query) => {
                const lower = query.toLowerCase();
                return getNotes()
                    .filter(n => (n.title || 'Untitled').toLowerCase().includes(lower))
                    .slice(0, 5)
                    .map(n => ({
                        id: n.id,
                        label: n.title || 'Untitled',
                        description: 'Note'
                    }));
            }, '@'),
        }).extend({name: 'noteSuggestion'}),

        Mention.configure({
            HTMLAttributes: {
                class: 'suggestion-note',
            },
            suggestion: {
                ...configureSuggestions((query) => {
                    const lower = query.toLowerCase();
                    return getNotes()
                        .filter(n => (n.title || 'Untitled').toLowerCase().includes(lower))
                        .slice(0, 5)
                        .map(n => ({
                            id: n.id,
                            label: n.title || 'Untitled',
                            description: 'Note'
                        }));
                }, '[['), // Wiki-link style trigger
                command: ({editor, range, props}) => {
                    // Delete the trigger and query
                    editor.chain().focus().deleteRange(range).run();
                    // Insert the standard mention node
                    editor.chain().focus().insertContent({
                        type: 'noteSuggestion', // Use the existing note suggestion type
                        attrs: {
                            id: props.id,
                            label: props.label
                        }
                    }).insertContent(' ').run();
                }
            }
        }).extend({name: 'wikiLinkSuggestion'}),

        Mention.configure({
            HTMLAttributes: {
                class: 'suggestion-slash',
            },
            suggestion: {
                ...configureSuggestions((query) => {
                    const lower = query.toLowerCase();

                    // Sort templates: prioritize those matching content "keywords" if possible?
                    // For now, simple alphabetical or query match relevance
                    const templateItems = templates
                        .filter(t => t.label.toLowerCase().includes(lower))
                        .sort((a, b) => {
                            // Prioritize templates starting with query
                            const aStarts = a.label.toLowerCase().startsWith(lower);
                            const bStarts = b.label.toLowerCase().startsWith(lower);
                            if (aStarts && !bStarts) return -1;
                            if (!aStarts && bStarts) return 1;
                            return 0;
                        })
                        .map(t => ({
                            id: t.content, // Insert content
                            label: t.label,
                            description: 'Template',
                            type: 'template'
                        }));

                    const propertyItems = allProperties
                        .filter(p => p.label.toLowerCase().includes(lower))
                        .map(p => ({
                            id: `[${p.label}:is:]`, // Updated default template
                            label: p.label,
                            description: 'Property',
                            type: 'property'
                        }));

                    const commandItems = [];
                    if ('magic align'.includes(lower)) {
                        commandItems.push({
                            id: 'magic',
                            label: 'Magic Align',
                            description: 'Auto-detect properties',
                            type: 'command'
                        });
                    }
                    if ('current date'.includes(lower)) {
                        commandItems.push({
                            id: 'date',
                            label: 'Current Date',
                            description: new Date().toISOString().split('T')[0],
                            type: 'command'
                        });
                    }
                    if ('current time'.includes(lower)) {
                        commandItems.push({
                            id: 'time',
                            label: 'Current Time',
                            description: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
                            type: 'command'
                        });
                    }

                    return [...commandItems, ...templateItems, ...propertyItems].slice(0, 10).map(item => ({
                        ...item,
                        type: item.type as "tag" | "property" | "template" | undefined
                    }));
                }, '/'),
                command: ({editor, range, props}) => {
                    // Delete the slash command text
                    editor.chain().focus().deleteRange(range).run();

                    const slashProps = props as unknown as SlashCommandAttrs;

                    if (slashProps.type === 'property' && onOpenPropertyModal) {
                        onOpenPropertyModal(props.label || '');
                        return;
                    }

                    if (slashProps.type === 'command') {
                        if (props.id === 'magic' && onMagic) {
                            onMagic();
                        } else if (props.id === 'date') {
                            editor.chain().focus().insertContent(new Date().toISOString().split('T')[0]).run();
                        } else if (props.id === 'time') {
                            editor.chain().focus().insertContent(new Date().toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })).run();
                        }
                        return;
                    }

                    // Insert the content
                    const content = props.id || '';
                    editor.chain().focus().insertContent(content).run();
                },
            }
        }).extend({name: 'slashCommand'}),
    ];
};
