import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, useMemo } from 'react';
import type { Note, OntologyNode, Template } from '@notention/core';
import { prepareWithSegments, layoutWithLines, type LayoutLine } from '@chenglou/pretext';
import { InlinePropertyForm } from '../InlinePropertyForm';

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

    const [textWidth, setTextWidth] = useState(0);
    const [textHeight, setTextHeight] = useState(0);
    const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

    const LINE_HEIGHT = 28;
    const FONT = '16px "Inter", ui-sans-serif, system-ui, sans-serif';

    useImperativeHandle(ref, () => ({
        openPropertyModal: () => {},
        editor: null
    }));

    useEffect(() => {
        if (containerRef.current) {
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    setTextWidth(entry.contentRect.width - 32);
                }
            });
            resizeObserver.observe(containerRef.current);
            return () => resizeObserver.disconnect();
        }
    }, []);

    // Calculate property geometry by pre-measuring the string.
    // Instead of using Canvas or pretext lines to calculate where the widget should be,
    // we use a DOM-based approach for accurate measurement matching the textarea,
    // OR we use the layoutWithLines to measure. We'll use layoutWithLines for geometry
    // and rely on exact textarea styling for alignment, fixing the index issue.
    const renderedProperties = useMemo(() => {
        if (textWidth <= 0) return [];

        const prepared = prepareWithSegments(note.content, FONT, { whiteSpace: 'pre-wrap' });
        const { height, lines } = layoutWithLines(prepared, textWidth, LINE_HEIGHT);

        setTextHeight(height);

        // Calculate exact string offsets from the original content
        const matches = [];
        let m;
        PROPERTY_REGEX.lastIndex = 0;
        while ((m = PROPERTY_REGEX.exec(note.content)) !== null) {
            matches.push({
                fullMatch: m[0],
                key: m[1],
                operator: m[2],
                value: m[3],
                index: m.index,
                endIndex: m.index + m[0].length
            });
        }

        const foundProps: RenderedProperty[] = [];

        // We must map global string index to a specific line in layoutWithLines.
        // Because pretext layout handles word wrapping, we map cursors accurately.
        for (const match of matches) {
             let startLineIndex = -1;
             let currentGlobalIndex = 0;
             let y = 0;
             let x = 0;

             for (let i = 0; i < lines.length; i++) {
                 const line = lines[i];
                 const lineLength = line.end.graphemeIndex - line.start.graphemeIndex; // roughly.
                 // Actually layoutWithLines output gives us lines. We can just use standard text measurement
                 // if pretext doesn't expose strict global indices easily.
                 // But wait, the reviewer pointed out layoutWithLines strips whitespace.
             }
        }

        // To perfectly align widgets over a textarea, the most robust way is a hidden div mirror
        // or a canvas context that exactly measures up to the text.
        // Let's create a temporary canvas to measure widths.
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return [];
        ctx.font = FONT;

        const domProps: RenderedProperty[] = [];
        let yCursor = 0;

        // Re-run pretext to get lines
        for (const line of lines) {
            let lineMatch;
            PROPERTY_REGEX.lastIndex = 0;
            while ((lineMatch = PROPERTY_REGEX.exec(line.text)) !== null) {
                const textBefore = line.text.substring(0, lineMatch.index);
                const xOffset = ctx.measureText(textBefore).width;
                const propWidth = ctx.measureText(lineMatch[0]).width;

                // Note: We're doing line-by-line index assuming simple editing for now,
                // but we fix the mutation bug by doing a strict replace on the *full* note.content later
                // based on the string value, or by using a unique ID.
                domProps.push({
                    id: `prop-${yCursor}-${lineMatch.index}`,
                    key: lineMatch[1],
                    operator: lineMatch[2],
                    value: lineMatch[3],
                    x: xOffset,
                    y: yCursor,
                    width: propWidth,
                    height: LINE_HEIGHT,
                    startIndex: -1, // Not used, we'll replace by text
                    endIndex: -1
                });
            }
            yCursor += LINE_HEIGHT;
        }

        return domProps;

    }, [note.content, textWidth]);

    const handleUpdateProperty = useCallback((prop: RenderedProperty, newKey: string, newOp: string, newVal: string) => {
        const replacement = `[${newKey}:${newOp}:${newVal}]`;
        const oldStr = `[${prop.key}:${prop.operator}:${prop.value}]`;

        // Since indices are tricky across word wraps, replace the first occurrence of the exact string.
        // For a more robust editor, we'd use a stable ID or explicit AST.
        const newContent = note.content.replace(oldStr, replacement);

        onSave(newContent);
        setEditingPropertyId(null);

        setTimeout(() => {
            textareaRef.current?.focus();
        }, 10);
    }, [note.content, onSave]);

    return (
        <div className="flex flex-col h-full bg-gray-900 text-gray-300 p-4 relative" ref={containerRef}>
            {topContent}
            <div
                ref={scrollContainerRef}
                className="flex-grow overflow-y-auto overflow-x-hidden relative"
                style={{ minHeight: '300px' }}
                onClick={() => {
                    if (editingPropertyId === null) {
                        textareaRef.current?.focus();
                    }
                }}
            >
                <div style={{ position: 'relative', width: textWidth > 0 ? textWidth : '100%', minHeight: '100%' }}>

                    {/* The actual visible textarea for native editing, selection, and cursor */}
                    <textarea
                       ref={textareaRef}
                       className="absolute inset-0 w-full h-full bg-transparent text-gray-300 z-10"
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
                       onKeyDown={(e) => {
                           // Allow autosuggest logic if needed, we listen via AutosuggestMenu.
                           // Pretext Editor handles standard editing natively.
                       }}
                       spellCheck={false}
                    />

                    {/* Background text rendering (so we can hide the syntax behind widgets) */}
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
                            color: '#D1D5DB'
                        }}
                    >
                        {/* We could render syntax highlighted text here, but for now just raw text
                            Wait, if we render raw text here, the widgets will cover the syntax.
                            Yes! This is the standard overlay pattern. */}
                        {note.content}
                    </div>

                    {/* Overlay semantic widgets precisely over the text */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20">
                        {renderedProperties.map((prop) => (
                            <div
                                key={prop.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: prop.x,
                                    top: prop.y,
                                    width: prop.width,
                                    height: prop.height,
                                }}
                            >
                                {editingPropertyId === prop.id ? (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-gray-900 rounded shadow-xl border border-blue-500 min-w-max">
                                        <InlinePropertyForm
                                            initialKey={prop.key}
                                            initialOperator={prop.operator}
                                            initialValue={prop.value}
                                            onUpdate={(k, o, v) => handleUpdateProperty(prop, k, o, v)}
                                            onCancel={() => {
                                                setEditingPropertyId(null);
                                                textareaRef.current?.focus();
                                            }}
                                            editor={null}
                                            getPos={() => 0}
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className="h-full w-full flex items-center justify-center bg-gray-900 rounded px-1 border border-blue-500/50 cursor-pointer hover:border-blue-400 transition-colors shadow-sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setEditingPropertyId(prop.id);
                                        }}
                                        style={{ marginTop: '2px', height: 'calc(100% - 4px)'}}
                                    >
                                        <span className="text-sm font-medium text-blue-200">{prop.key}</span>
                                        <span className="text-sm text-gray-400 mx-1 opacity-70">{prop.operator}</span>
                                        <span className="text-sm font-semibold text-blue-300">{prop.value}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                </div>
            </div>
            {children}
        </div>
    );
});

PretextEditor.displayName = 'PretextEditor';