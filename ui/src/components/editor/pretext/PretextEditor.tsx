import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, useMemo } from 'react';
import type { Note, OntologyNode, Template } from '@notention/core';
import { prepareWithSegments, layoutWithLines, type LayoutLine } from '@chenglou/pretext';
import { InlinePropertyForm } from '../InlinePropertyForm';
import { EditorActionsProvider } from '../../../hooks/index';

interface TiptapEditorProps {
    note: Note;
    onSave: (updatedContent: string) => void;
    ontology: OntologyNode[];
    templates?: Template[];
    minimal?: boolean;
    showToolbar?: boolean;
    onMagic?: () => void;
    onTemplates?: () => void;
    notes?: Note[];
    onPickLocation?: () => Promise<string>;
    saveStatus?: 'saved' | 'saving' | 'error';
    children?: React.ReactNode;
    topContent?: React.ReactNode;
}

export interface TiptapEditorRef {
    openPropertyModal: (key?: string) => void;
    editor: any | null;
}

const PROPERTY_REGEX = /\[([^\]:]+):([^\]:]+):([^\]]+)\]/g;

interface RenderedProperty {
    id: string;
    key: string;
    operator: string;
    value: string;
    x: number;
    y: number;
    width: number;
    height: number;
    startIndex: number;
    endIndex: number;
}

type Token =
  | { type: 'text'; content: string }
  | { type: 'property'; id: number; fullMatch: string; key: string; operator: string; value: string; start: number; end: number };

export const PretextEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(({
    note,
    onSave,
    ontology,
    templates,
    minimal = false,
    showToolbar = true,
    onMagic,
    onTemplates,
    notes = [],
    onPickLocation,
    saveStatus,
    children,
    topContent
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [activeToken, setActiveToken] = useState<Token | null>(null);
    const [popupPos, setPopupPos] = useState<{ top: number, left: number } | null>(null);

    const LINE_HEIGHT = 28;

    useImperativeHandle(ref, () => ({
        openPropertyModal: () => {},
        editor: null
    }));

    // Tokenize text into inline segments
    const tokens = useMemo(() => {
        const t: Token[] = [];
        let lastIndex = 0;
        PROPERTY_REGEX.lastIndex = 0;
        let match;
        let idCounter = 0;

        while ((match = PROPERTY_REGEX.exec(note.content)) !== null) {
            if (match.index > lastIndex) {
                t.push({ type: 'text', content: note.content.substring(lastIndex, match.index) });
            }
            t.push({
                type: 'property',
                id: idCounter++,
                fullMatch: match[0],
                key: match[1],
                operator: match[2],
                value: match[3],
                start: match.index,
                end: match.index + match[0].length
            });
            lastIndex = PROPERTY_REGEX.lastIndex;
        }
        if (lastIndex < note.content.length) {
            t.push({ type: 'text', content: note.content.substring(lastIndex) });
        }
        return t;
    }, [note.content]);

    const handleUpdateProperty = useCallback((token: Extract<Token, {type: 'property'}>, newKey: string, newOp: string, newVal: string) => {
        const replacement = `[${newKey}:${newOp}:${newVal}]`;
        const before = note.content.substring(0, token.start);
        const after = note.content.substring(token.end);
        const newContent = `${before}${replacement}${after}`;

        onSave(newContent);
        setActiveToken(null);
        setPopupPos(null);

        // Place cursor right after the newly updated property token
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newPos = token.start + replacement.length;
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 10);
    }, [note.content, onSave]);

    const handleCaretMove = useCallback(() => {
        if (!textareaRef.current) return;
        const caret = textareaRef.current.selectionStart;

        // Find if cursor is strictly inside a property token
        const token = tokens.find(t => t.type === 'property' && caret > t.start && caret < t.end) as Extract<Token, {type: 'property'}> | undefined;

        if (token) {
            const el = document.getElementById(`prop-${token.id}`);
            const scrollContainer = scrollContainerRef.current;
            if (el && scrollContainer) {
                // Calculate position relative to scroll container
                const elRect = el.getBoundingClientRect();
                const containerRect = scrollContainer.getBoundingClientRect();

                setPopupPos({
                    top: elRect.top - containerRect.top + scrollContainer.scrollTop - 40, // Position above the element
                    left: Math.max(0, elRect.left - containerRect.left + scrollContainer.scrollLeft - 10)
                });
                setActiveToken(token);
            }
        } else {
            setActiveToken(null);
            setPopupPos(null);
        }
    }, [tokens]);

    // Handle block deletion of properties
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!textareaRef.current) return;

        const caret = textareaRef.current.selectionStart;

        // Tab navigation between properties
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            // Find the next property after the current cursor
            const nextToken = tokens.find(t => t.type === 'property' && t.start >= caret) as Extract<Token, {type: 'property'}> | undefined;
            if (nextToken) {
                // Place cursor just inside it to trigger edit mode
                textareaRef.current.setSelectionRange(nextToken.start + 1, nextToken.start + 1);
                handleCaretMove();
                return;
            }
        } else if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            // Find the previous property before the current cursor
            const prevToken = [...tokens].reverse().find(t => t.type === 'property' && t.end <= caret) as Extract<Token, {type: 'property'}> | undefined;
            if (prevToken) {
                textareaRef.current.setSelectionRange(prevToken.end - 1, prevToken.end - 1);
                handleCaretMove();
                return;
            }
        }

        if (e.key === 'Backspace') {
            // Delete entire block if cursor is right after it
            const tokenBeforeCaret = tokens.find(t => t.type === 'property' && caret === t.end) as Extract<Token, {type: 'property'}> | undefined;
            if (tokenBeforeCaret && textareaRef.current.selectionStart === textareaRef.current.selectionEnd) {
                e.preventDefault();
                const before = note.content.substring(0, tokenBeforeCaret.start);
                const after = note.content.substring(tokenBeforeCaret.end);
                onSave(`${before}${after}`);

                // Keep cursor at the deletion point
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.setSelectionRange(tokenBeforeCaret.start, tokenBeforeCaret.start);
                    }
                }, 0);
            }
        } else if (e.key === 'Delete') {
             // Delete entire block if cursor is right before it
             const tokenAfterCaret = tokens.find(t => t.type === 'property' && caret === t.start) as Extract<Token, {type: 'property'}> | undefined;
             if (tokenAfterCaret && textareaRef.current.selectionStart === textareaRef.current.selectionEnd) {
                 e.preventDefault();
                 const before = note.content.substring(0, tokenAfterCaret.start);
                 const after = note.content.substring(tokenAfterCaret.end);
                 onSave(`${before}${after}`);

                 setTimeout(() => {
                     if (textareaRef.current) {
                         textareaRef.current.setSelectionRange(tokenAfterCaret.start, tokenAfterCaret.start);
                     }
                 }, 0);
             }
        }
    }, [note.content, tokens, onSave]);

    return (
        <div className="flex flex-col h-full bg-gray-900 text-gray-300 p-4 relative" ref={containerRef}>
            {topContent}
            <div
                ref={scrollContainerRef}
                className="flex-grow overflow-y-auto overflow-x-hidden relative"
                style={{ minHeight: '300px' }}
                onClick={() => {
                    if (!activeToken) {
                        textareaRef.current?.focus();
                    }
                }}
            >
                <div style={{ position: 'relative', width: '100%', minHeight: '100%' }}>

                    {/* The actual visible textarea for native editing, selection, and cursor */}
                    <textarea
                       ref={textareaRef}
                       className="absolute inset-0 w-full h-full bg-transparent text-gray-300 z-10 pretext-textarea"
                       style={{
                           lineHeight: `${LINE_HEIGHT}px`,
                           fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
                           fontSize: '16px',
                           padding: 0,
                           border: 'none',
                           overflow: 'hidden',
                           resize: 'none',
                           whiteSpace: 'pre-wrap',
                           wordWrap: 'break-word',
                           wordBreak: 'normal',
                           outline: 'none',
                           // Hide text color under widgets
                           color: 'transparent',
                           caretColor: '#D1D5DB'
                       }}
                       value={note.content}
                       onChange={(e) => onSave(e.target.value)}
                       onClick={handleCaretMove}
                       onKeyUp={handleCaretMove}
                       onKeyDown={handleKeyDown}
                       spellCheck={false}
                    />

                    {/* Background text rendering perfectly synced with textarea */}
                    <div
                        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
                        style={{
                            lineHeight: `${LINE_HEIGHT}px`,
                            fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
                            fontSize: '16px',
                            padding: 0,
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            wordBreak: 'normal',
                            color: '#D1D5DB' // Base text color
                        }}
                    >
                        {tokens.map((token, i) => {
                            if (token.type === 'text') {
                                return <span key={i}>{token.content}</span>;
                            } else {
                                const m = token;
                                // We apply inline styling so it doesn't break horizontal sizing.
                                // We use outlines instead of borders to prevent width recalculations.
                                const isEditing = activeToken?.id === m.id;
                                return (
                                    <span
                                        key={i}
                                        id={`prop-${m.id}`}
                                        className={`rounded-sm transition-colors ${isEditing ? 'bg-blue-800/60 outline outline-2 outline-blue-400' : 'bg-blue-900/40 outline outline-1 outline-blue-500/30'}`}
                                    >
                                        <span className="text-blue-400/80">[{m.key}</span>
                                        <span className="text-gray-500/70">:{m.operator}:</span>
                                        <span className="text-blue-300">{m.value}]</span>
                                    </span>
                                );
                            }
                        })}
                        {/* Append a trailing space if the note ends with a newline to ensure the textarea scroll matches the div */}
                        {note.content.endsWith('\n') ? <br /> : null}
                    </div>

                    {/* Popups overlay layer */}
                    {activeToken && popupPos && (
                        <div
                            className="absolute z-50 shadow-xl min-w-max"
                            style={{ top: popupPos.top, left: popupPos.left }}
                        >
                            <EditorActionsProvider onPickLocation={onPickLocation}>
                                <InlinePropertyForm
                                    initialKey={activeToken.key}
                                    initialOperator={activeToken.operator}
                                    initialValue={activeToken.value}
                                    onUpdate={(k, o, v) => handleUpdateProperty(activeToken, k, o, v)}
                                    onCancel={() => {
                                        setActiveToken(null);
                                        setPopupPos(null);
                                        textareaRef.current?.focus();
                                    }}
                                    editor={null}
                                    getPos={() => 0}
                                />
                            </EditorActionsProvider>
                        </div>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
});

PretextEditor.displayName = 'PretextEditor';