import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import {cn} from '../../utils/ui';

/**
 * BaseEditor - Foundation for editors with dirty tracking and autosave
 * 
 * Provides:
 * - Dirty state tracking (unsaved changes)
 * - Autosave with configurable debounce
 * - Save/cancel/discard actions
 * - Keyboard shortcuts (Ctrl+S to save, Escape to cancel)
 * - Validation integration
 * - Change history for undo/redo
 * - Lifecycle callbacks
 */

export interface EditorState<T> {
    /** Current data */
    data: T;
    /** Whether there are unsaved changes */
    isDirty: boolean;
    /** Whether saving is in progress */
    isSaving: boolean;
    /** Whether the editor is in edit mode */
    isEditing: boolean;
    /** Last saved timestamp */
    lastSavedAt: Date | null;
    /** Validation errors */
    errors: Record<string, string>;
    /** Change history for undo/redo */
    history: T[];
    /** Current history index */
    historyIndex: number;
}

export interface BaseEditorProps<T> {
    /** Initial data */
    initialData: T;
    /** Called to save data */
    onSave: (data: T) => Promise<void> | void;
    /** Called when data changes */
    onChange?: (data: T) => void;
    /** Called when dirty state changes */
    onDirtyChange?: (isDirty: boolean) => void;
    /** Called when save completes */
    onSaved?: (data: T) => void;
    /** Called when save fails */
    onSaveError?: (error: Error) => void;
    /** Called when cancel/discard */
    onCancel?: () => void;
    /** Validate data */
    validate?: (data: T) => Record<string, string>;
    /** Autosave delay in ms (0 = disabled) */
    autosaveDelay?: number;
    /** Maximum history size for undo/redo */
    maxHistorySize?: number;
    /** Enable keyboard shortcuts */
    keyboardShortcuts?: boolean;
    /** Initial edit mode */
    defaultEditing?: boolean;
    /** Additional className */
    className?: string;
    /** Render editor content */
    children: (state: EditorState<T>, actions: EditorActions<T>) => React.ReactNode;
}

interface UseEditorOptions<T> extends Omit<BaseEditorProps<T>, 'children' | 'className'> {}

export interface EditorActions<T> {
    /** Update data */
    setData: (data: T | ((prev: T) => T)) => void;
    /** Update a specific field */
    setField: <K extends keyof T>(key: K, value: T[K]) => void;
    /** Save current data */
    save: () => Promise<void>;
    /** Cancel changes (revert to last saved) */
    cancel: () => void;
    /** Discard changes without saving */
    discard: () => void;
    /** Toggle edit mode */
    toggleEditing: () => void;
    /** Set edit mode */
    setEditing: (editing: boolean) => void;
    /** Undo last change */
    undo: () => void;
    /** Redo last undone change */
    redo: () => void;
    /** Check if can undo */
    canUndo: () => boolean;
    /** Check if can redo */
    canRedo: () => boolean;
    /** Reset to initial state */
    reset: () => void;
    /** Mark as saved (for external saves) */
    markSaved: () => void;
}

function useEditor<T>({
    initialData,
    onSave,
    onChange,
    onDirtyChange,
    onSaved,
    onSaveError,
    onCancel,
    validate,
    autosaveDelay = 2000,
    maxHistorySize = 50,
    keyboardShortcuts = true,
    defaultEditing = true,
}: UseEditorOptions<T>) {
    const [data, setDataState] = useState<T>(initialData);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(defaultEditing);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<T[]>([initialData]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedDataRef = useRef<T>(initialData);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (autosaveTimeoutRef.current) {
                clearTimeout(autosaveTimeoutRef.current);
            }
        };
    }, []);

    // Validate on data change
    useEffect(() => {
        if (validate) {
            const newErrors = validate(data);
            setErrors(newErrors);
        }
    }, [data, validate]);

    // Autosave
    useEffect(() => {
        if (!isDirty || autosaveDelay <= 0) return;

        if (autosaveTimeoutRef.current) {
            clearTimeout(autosaveTimeoutRef.current);
        }

        autosaveTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && isDirty && !isSaving) {
                save();
            }
        }, autosaveDelay);

        return () => {
            if (autosaveTimeoutRef.current) {
                clearTimeout(autosaveTimeoutRef.current);
            }
        };
    }, [isDirty, autosaveDelay, isSaving]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!keyboardShortcuts) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (isDirty && !isSaving) {
                    save();
                }
            }
            // Escape to cancel
            if (e.key === 'Escape' && isEditing) {
                cancel();
            }
            // Ctrl+Z to undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Ctrl+Shift+Z or Ctrl+Y to redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [keyboardShortcuts, isDirty, isSaving, isEditing]);

    const addToHistory = useCallback((newData: T) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(newData);
            if (newHistory.length > maxHistorySize) {
                newHistory.shift();
            }
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
    }, [historyIndex, maxHistorySize]);

    const setData = useCallback((newData: T | ((prev: T) => T)) => {
        setDataState(prev => {
            const resolved = typeof newData === 'function' ? (newData as (prev: T) => T)(prev) : newData;
            if (resolved !== prev) {
                addToHistory(resolved);
            }
            return resolved;
        });
    }, [addToHistory]);

    const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        setData(prev => ({...prev, [key]: value}));
    }, [setData]);

    const save = useCallback(async () => {
        if (isSaving) return;

        // Validate before saving
        if (validate) {
            const validationErrors = validate(data);
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return;
            }
        }

        setIsSaving(true);
        setErrors({});

        try {
            await onSave(data);
            lastSavedDataRef.current = data;
            setIsDirty(false);
            setLastSavedAt(new Date());
            setIsEditing(false);
            onSaved?.(data);
        } catch (error) {
            onSaveError?.(error instanceof Error ? error : new Error(String(error)));
        } finally {
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
    }, [data, isSaving, onSave, onSaved, onSaveError, validate]);

    const cancel = useCallback(() => {
        setData(lastSavedDataRef.current);
        setIsDirty(false);
        setIsEditing(false);
        onCancel?.();
    }, [setData]);

    const discard = useCallback(() => {
        setData(initialData);
        setIsDirty(false);
        setIsEditing(false);
        lastSavedDataRef.current = initialData;
        setLastSavedAt(null);
        onCancel?.();
    }, [setData, initialData]);

    const toggleEditing = useCallback(() => {
        setIsEditing(prev => !prev);
    }, []);

    const setEditing = useCallback((editing: boolean) => {
        setIsEditing(editing);
        if (!editing && isDirty) {
            cancel();
        }
    }, [isDirty, cancel]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setDataState(history[newIndex]);
        }
    }, [historyIndex, history]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setDataState(history[newIndex]);
        }
    }, [historyIndex, history]);

    const canUndo = useCallback(() => historyIndex > 0, [historyIndex]);
    const canRedo = useCallback(() => historyIndex < history.length - 1, [historyIndex, history.length]);

    const reset = useCallback(() => {
        setData(initialData);
        setIsDirty(false);
        setIsEditing(defaultEditing);
        lastSavedDataRef.current = initialData;
        setLastSavedAt(null);
        setHistory([initialData]);
        setHistoryIndex(0);
        setErrors({});
    }, [setData, initialData, defaultEditing]);

    const markSaved = useCallback(() => {
        lastSavedDataRef.current = data;
        setIsDirty(false);
        setLastSavedAt(new Date());
        setIsEditing(false);
    }, [data]);

    // Notify parent of dirty state changes
    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    // Notify parent of data changes
    useEffect(() => {
        onChange?.(data);
    }, [data, onChange]);

    const state: EditorState<T> = {
        data,
        isDirty,
        isSaving,
        isEditing,
        lastSavedAt,
        errors,
        history,
        historyIndex,
    };

    const actions: EditorActions<T> = {
        setData,
        setField,
        save,
        cancel,
        discard,
        toggleEditing,
        setEditing,
        undo,
        redo,
        canUndo,
        canRedo,
        reset,
        markSaved,
    };

    return {state, actions};
}

/**
 * BaseEditor component
 */
export function BaseEditor<T>({
    initialData,
    onSave,
    onChange,
    onDirtyChange,
    onSaved,
    onSaveError,
    onCancel,
    validate,
    autosaveDelay = 2000,
    maxHistorySize = 50,
    keyboardShortcuts = true,
    defaultEditing = true,
    className = '',
    children,
}: BaseEditorProps<T>) {
    const {state, actions} = useEditor<T>({
        initialData,
        onSave,
        onChange,
        onDirtyChange,
        onSaved,
        onSaveError,
        onCancel,
        validate,
        autosaveDelay,
        maxHistorySize,
        keyboardShortcuts,
        defaultEditing,
    });

    return (
        <div className={cn('relative', className)}>
            {children(state, actions)}
        </div>
    );
}

/**
 * Editor toolbar with save/cancel/undo/redo actions
 */
export interface EditorToolbarProps<T> {
    state: EditorState<T>;
    actions: EditorActions<T>;
    /** Show save button */
    showSave?: boolean;
    /** Show cancel button */
    showCancel?: boolean;
    /** Show undo/redo */
    showHistory?: boolean;
    /** Custom save button text */
    saveText?: string;
    /** Custom cancel button text */
    cancelText?: string;
    /** Additional className */
    className?: string;
}

export function EditorToolbar<T>({
    state,
    actions,
    showSave = true,
    showCancel = true,
    showHistory = true,
    saveText = 'Save',
    cancelText = 'Cancel',
    className = '',
}: EditorToolbarProps<T>) {
    const hasErrors = Object.keys(state.errors).length > 0;
    const canSave = state.isDirty && !state.isSaving && !hasErrors;

    return (
        <div className={cn(
            'flex items-center gap-2 p-3 border-b border-[var(--app-line)]',
            'bg-neutral-800/50',
            className
        )}>
            {showHistory && (
                <>
                    <button
                        onClick={actions.undo}
                        disabled={!actions.canUndo() || state.isSaving}
                        className={cn(
                            'p-2 rounded-lg text-sm text-[var(--app-text)]',
                            'hover:bg-[var(--app-line)] transition-colors',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                        aria-label="Undo"
                        title="Undo (Ctrl+Z)"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                    </button>
                    <button
                        onClick={actions.redo}
                        disabled={!actions.canRedo() || state.isSaving}
                        className={cn(
                            'p-2 rounded-lg text-sm text-[var(--app-text)]',
                            'hover:bg-[var(--app-line)] transition-colors',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                        aria-label="Redo"
                        title="Redo (Ctrl+Y)"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                        </svg>
                    </button>
                </>
            )}

            <div className="flex-1" />

            {showCancel && state.isEditing && (
                <button
                    onClick={actions.cancel}
                    disabled={state.isSaving}
                    className={cn(
                        'px-4 py-2 text-sm font-medium text-[var(--app-text)]',
                        'bg-[var(--app-line)] rounded-lg transition-colors',
                        'hover:bg-[var(--app-line-strong)] disabled:opacity-50'
                    )}
                >
                    {cancelText}
                </button>
            )}

            {showSave && (
                <button
                    onClick={actions.save}
                    disabled={!canSave || state.isSaving}
                    className={cn(
                        'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                        'bg-[var(--app-accent)] hover:bg-[var(--app-accent-strong)]',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                >
                    {state.isSaving ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Saving...
                        </>
                    ) : (
                        saveText
                    )}
                </button>
            )}

            {state.isDirty && !state.isSaving && !state.isEditing && (
                <span className="text-xs text-neutral-400">Unsaved changes</span>
            )}

            {state.lastSavedAt && (
                <span className="text-xs text-neutral-500">
                    Saved {state.lastSavedAt.toLocaleTimeString()}
                </span>
            )}
        </div>
    );
}

/**
 * Status indicator for editor state
 */
export interface EditorStatusProps {
    state: EditorState<any>;
    className?: string;
}

export function EditorStatus({state, className = ''}: EditorStatusProps) {
    if (!state.isDirty && !state.isSaving && !state.lastSavedAt) return null;

    return (
        <div className={cn('flex items-center gap-2 text-xs', className)}>
            {state.isSaving && (
                <>
                    <svg className="animate-spin h-3 w-3 text-[var(--app-accent)]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-[var(--app-accent)]">Saving...</span>
                </>
            )}
            {state.isDirty && !state.isSaving && (
                <>
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                    </span>
                    <span className="text-yellow-400">Unsaved</span>
                </>
            )}
            {state.lastSavedAt && !state.isDirty && !state.isSaving && (
                <span className="text-neutral-400">
                    Saved {state.lastSavedAt.toLocaleTimeString()}
                </span>
            )}
        </div>
    );
}