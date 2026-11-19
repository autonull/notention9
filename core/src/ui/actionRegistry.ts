/**
 * Action Registry (W5.1 prerequisite)
 * Internal registry for actions, keybindings, and command palette.
 * NOT a plugin API — internal only.
 */

export interface ActionContext {
    /** Current view identifier */
    view?: string;
    /** Selected note ID */
    noteId?: string;
    /** Selected text */
    selection?: string;
    /** Additional arbitrary context */
    [key: string]: unknown;
}

export type ActionHandler = (ctx: ActionContext) => void | Promise<void>;

export interface ActionShortcut {
    /** Primary key (e.g., 'k', 'Enter', 'ArrowUp') */
    key: string;
    /** Modifier keys */
    ctrl?: boolean;
    meta?: boolean; // Cmd on Mac, Ctrl on others
    shift?: boolean;
    alt?: boolean;
    /** Human-readable description */
    description?: string;
}

export interface Action {
    /** Unique identifier */
    id: string;
    /** Display label */
    label: string;
    /** Optional description for palette */
    description?: string;
    /** Category for grouping in palette */
    category?: string;
    /** Keyboard shortcut */
    shortcut?: ActionShortcut;
    /** Handler function */
    run: ActionHandler;
    /** Whether action is enabled (can be dynamic) */
    enabled?: (ctx: ActionContext) => boolean;
    /** Whether action should appear in palette */
    inPalette?: boolean;
    /** Priority for sorting (higher = first) */
    priority?: number;
    /** Tags for filtering */
    tags?: string[];
}

export interface RegisteredAction extends Action {
    /** Normalized shortcut string for display (e.g., 'Ctrl+K') */
    shortcutDisplay?: string;
    /** Whether shortcut is a chord (sequence) */
    isChord?: boolean;
}

interface Keybinding {
    actionId: string;
    shortcut: ActionShortcut;
    normalized: string;
}

/** Global action registry instance */
class ActionRegistry {
    private actions = new Map<string, RegisteredAction>();
    private keybindings = new Map<string, Keybinding>(); // normalized -> Keybinding
    private chordBuffer: string[] = [];
    private chordTimeout: ReturnType<typeof setTimeout> | null = null;
    private listeners = new Set<() => void>();

    /** Register an action */
    register(action: Action): void {
        if (this.actions.has(action.id)) {
            console.warn(`[ActionRegistry] Overwriting action: ${action.id}`);
        }

        const registered: RegisteredAction = {
            ...action,
            priority: action.priority ?? 0,
            inPalette: action.inPalette ?? true,
            enabled: action.enabled ?? (() => true),
            shortcutDisplay: action.shortcut ? this.normalizeShortcut(action.shortcut) : undefined,
        };

        this.actions.set(action.id, registered);

        // Register shortcut if provided
        if (action.shortcut) {
            const normalized = this.normalizeShortcut(action.shortcut);
            this.keybindings.set(normalized, {
                actionId: action.id,
                shortcut: action.shortcut,
                normalized,
            });
        }

        this.notify();
    }

    /** Unregister an action */
    unregister(id: string): void {
        const action = this.actions.get(id);
        if (action?.shortcut) {
            const normalized = this.normalizeShortcut(action.shortcut);
            this.keybindings.delete(normalized);
        }
        this.actions.delete(id);
        this.notify();
    }

    /** Get action by ID */
    get(id: string): RegisteredAction | undefined {
        return this.actions.get(id);
    }

    /** Get all registered actions */
    getAll(): RegisteredAction[] {
        return Array.from(this.actions.values());
    }

    /** Get actions for palette (enabled + inPalette) */
    getPaletteActions(ctx: ActionContext = {}): RegisteredAction[] {
        return this.getAll()
            .filter(a => a.inPalette && a.enabled!(ctx))
            .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    }

    /** Get actions by category */
    getByCategory(category: string): RegisteredAction[] {
        return this.getAll().filter(a => a.category === category);
    }

    /** Get all keybindings */
    getKeybindings(): Keybinding[] {
        return Array.from(this.keybindings.values());
    }

    /** Get keybinding for an action */
    getKeybinding(actionId: string): Keybinding | undefined {
        return Array.from(this.keybindings.values()).find(kb => kb.actionId === actionId);
    }

    /** Normalize shortcut to display string (e.g., 'Ctrl+K') */
    normalizeShortcut(shortcut: ActionShortcut): string {
        const parts: string[] = [];
        if (shortcut.ctrl) parts.push('Ctrl');
        if (shortcut.meta) parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
        if (shortcut.alt) parts.push('Alt');
        if (shortcut.shift) parts.push('Shift');
        parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
        return parts.join('+');
    }

    /** Parse normalized shortcut string back to ActionShortcut */
    parseShortcut(normalized: string): ActionShortcut | null {
        const parts = normalized.split('+');
        const shortcut: ActionShortcut = { key: '' };
        for (const part of parts) {
            const lower = part.toLowerCase();
            if (lower === 'ctrl') shortcut.ctrl = true;
            else if (lower === 'meta' || lower === '⌘' || lower === 'cmd') shortcut.meta = true;
            else if (lower === 'alt') shortcut.alt = true;
            else if (lower === 'shift') shortcut.shift = true;
            else shortcut.key = part;
        }
        return shortcut.key ? shortcut : null;
    }

    /** Check if shortcut conflicts with existing */
    checkConflict(shortcut: ActionShortcut, excludeActionId?: string): string | null {
        const normalized = this.normalizeShortcut(shortcut);
        const existing = this.keybindings.get(normalized);
        if (existing && existing.actionId !== excludeActionId) {
            return existing.actionId;
        }
        return null;
    }

    /** Handle keyboard event for chord detection and action execution */
    handleKeyDown(event: KeyboardEvent, ctx: ActionContext = {}): boolean {
        // Build normalized key string from event
        const parts: string[] = [];
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.metaKey) parts.push(navigator.platform.includes('Mac') ? 'Meta' : 'Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        parts.push(event.key);
        const normalized = parts.join('+');

        // Check for direct match
        const binding = this.keybindings.get(normalized);
        if (binding) {
            const action = this.actions.get(binding.actionId);
            if (action && action.enabled!(ctx)) {
                event.preventDefault();
                action.run(ctx);
                return true;
            }
        }

        // Chord handling (e.g., 'g' then 'g' for 'go to top')
        // For now, we only support single-key chords after a leader
        // This is a simplified version; full chord support would need more infrastructure
        return false;
    }

    /** Subscribe to registry changes */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }

    /** Reset to defaults (for testing) */
    reset(): void {
        this.actions.clear();
        this.keybindings.clear();
        this.notify();
    }
}

/** Singleton instance */
export const actionRegistry = new ActionRegistry();

/** Register built-in actions */
export function registerBuiltinActions(): void {
    // Navigation
    actionRegistry.register({
        id: 'nav.goToInbox',
        label: 'Go to Inbox',
        description: 'Switch to Inbox view',
        category: 'Navigation',
        shortcut: { key: '1', ctrl: true, description: 'Go to Inbox' },
        run: (ctx) => {
            // Handled by view router
            window.dispatchEvent(new CustomEvent('action:navigate', { detail: { view: 'inbox' } }));
        },
        priority: 100,
        tags: ['nav', 'view'],
    });

    actionRegistry.register({
        id: 'nav.goToNotes',
        label: 'Go to Notes',
        description: 'Switch to Notes view',
        category: 'Navigation',
        shortcut: { key: '2', ctrl: true, description: 'Go to Notes' },
        run: (ctx) => {
            window.dispatchEvent(new CustomEvent('action:navigate', { detail: { view: 'notes' } }));
        },
        priority: 99,
        tags: ['nav', 'view'],
    });

    actionRegistry.register({
        id: 'nav.goToGraph',
        label: 'Go to Graph',
        description: 'Switch to Graph view',
        category: 'Navigation',
        shortcut: { key: '3', ctrl: true, description: 'Go to Graph' },
        run: (ctx) => {
            window.dispatchEvent(new CustomEvent('action:navigate', { detail: { view: 'graph' } }));
        },
        priority: 98,
        tags: ['nav', 'view'],
    });

    actionRegistry.register({
        id: 'nav.goToSettings',
        label: 'Go to Settings',
        description: 'Switch to Settings view',
        category: 'Navigation',
        shortcut: { key: ',', ctrl: true, description: 'Open Settings' },
        run: (ctx) => {
            window.dispatchEvent(new CustomEvent('action:navigate', { detail: { view: 'settings' } }));
        },
        priority: 97,
        tags: ['nav', 'view', 'settings'],
    });

    // Capture
    actionRegistry.register({
        id: 'capture.focus',
        label: 'Focus Capture',
        description: 'Focus the quick capture input',
        category: 'Capture',
        shortcut: { key: 'k', ctrl: true, description: 'Focus capture input' },
        run: (ctx) => {
            window.dispatchEvent(new CustomEvent('action:focusCapture'));
        },
        priority: 100,
        tags: ['capture', 'shortcut'],
    });

    actionRegistry.register({
        id: 'capture.newTask',
        label: 'New Task',
        description: 'Create a new task note',
        category: 'Capture',
        shortcut: { key: 't', ctrl: true, description: 'New task' },
        run: (ctx) => {
            window.dispatchEvent(new CustomEvent('action:newNote', { detail: { type: 'task' } }));
        },
        priority: 90,
        tags: ['capture', 'task'],
    });

    actionRegistry.register({
        id: 'capture.newJournal',
        label: 'New Journal Entry',
        description: 'Create a new journal note',
        category: 'Capture',
        shortcut: { key: 'j', ctrl: true, description: 'New journal entry' },
        run: (ctx) => {
            window.dispatchEvent(new CustomEvent('action:newNote', { detail: { type: 'journal' } }));
        },
        priority: 89,
        tags: ['capture', 'journal'],
    });

    // Note actions
    actionRegistry.register({
        id: 'note.delete',
        label: 'Delete Note',
        description: 'Move selected note to trash',
        category: 'Note',
        shortcut: { key: 'Delete', description: 'Delete note' },
        run: (ctx) => {
            if (ctx.noteId) {
                window.dispatchEvent(new CustomEvent('action:deleteNote', { detail: { noteId: ctx.noteId } }));
            }
        },
        enabled: (ctx) => !!ctx.noteId,
        priority: 80,
        tags: ['note', 'delete'],
    });

    actionRegistry.register({
        id: 'note.duplicate',
        label: 'Duplicate Note',
        description: 'Create a copy of the selected note',
        category: 'Note',
        shortcut: { key: 'd', ctrl: true, description: 'Duplicate note' },
        run: (ctx) => {
            if (ctx.noteId) {
                window.dispatchEvent(new CustomEvent('action:duplicateNote', { detail: { noteId: ctx.noteId } }));
            }
        },
        enabled: (ctx) => !!ctx.noteId,
        priority: 79,
        tags: ['note', 'duplicate'],
    });

    // Search
    actionRegistry.register({
        id: 'search.open',
        label: 'Search Notes',
        description: 'Open search/filter',
        category: 'Search',
        shortcut: { key: 'f', ctrl: true, description: 'Search notes' },
        run: (ctx) => {
            window.dispatchEvent(new CustomEvent('action:openSearch'));
        },
        priority: 100,
        tags: ['search', 'filter'],
    });

    // Palette
    actionRegistry.register({
        id: 'palette.open',
        label: 'Open Command Palette',
        description: 'Open the command palette',
        category: 'Palette',
        shortcut: { key: 'p', ctrl: true, description: 'Open command palette' },
        run: (ctx) => {
            window.dispatchEvent(new CustomEvent('action:openPalette'));
        },
        priority: 100,
        tags: ['palette', 'command'],
        inPalette: false, // Don't show in palette itself
    });

    // Match actions
    actionRegistry.register({
        id: 'match.accept',
        label: 'Accept Match',
        description: 'Accept the current match and create response',
        category: 'Match',
        shortcut: { key: 'Enter', ctrl: true, description: 'Accept match' },
        run: (ctx) => {
            window.dispatchEvent(new CustomEvent('action:acceptMatch', { detail: ctx }));
        },
        enabled: (ctx) => ctx.view === 'inbox' && !!ctx.noteId,
        priority: 90,
        tags: ['match', 'accept'],
    });

    actionRegistry.register({
        id: 'match.reject',
        label: 'Reject Match',
        description: 'Dismiss the current match',
        category: 'Match',
        shortcut: { key: 'Escape', description: 'Reject match' },
        run: (ctx) => {
            window.dispatchEvent(new CustomEvent('action:rejectMatch', { detail: ctx }));
        },
        enabled: (ctx) => ctx.view === 'inbox' && !!ctx.noteId,
        priority: 89,
        tags: ['match', 'reject'],
    });

    // Help
    actionRegistry.register({
        id: 'help.shortcuts',
        label: 'Keyboard Shortcuts',
        description: 'Show keyboard shortcuts reference',
        category: 'Help',
        shortcut: { key: '?', shift: true, description: 'Show shortcuts' },
        run: (ctx) => {
            window.dispatchEvent(new CustomEvent('action:openShortcutsHelp'));
        },
        priority: 50,
        tags: ['help', 'shortcuts'],
    });
}

/** React hook for using action registry */
export function useActionRegistry() {
    // This is a placeholder for the React hook
    // Actual implementation would be in ui/src/hooks/useActionRegistry.ts
    return {
        register: actionRegistry.register.bind(actionRegistry),
        unregister: actionRegistry.unregister.bind(actionRegistry),
        get: actionRegistry.get.bind(actionRegistry),
        getAll: actionRegistry.getAll.bind(actionRegistry),
        getPaletteActions: actionRegistry.getPaletteActions.bind(actionRegistry),
        getKeybindings: actionRegistry.getKeybindings.bind(actionRegistry),
        checkConflict: actionRegistry.checkConflict.bind(actionRegistry),
        handleKeyDown: actionRegistry.handleKeyDown.bind(actionRegistry),
        subscribe: actionRegistry.subscribe.bind(actionRegistry),
    };
}