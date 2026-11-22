import {MOD_LABEL} from '../utils/platform';

export interface ShortcutItem {
    label: string;
    keys: string[];
    description?: string;
    global?: boolean;
    action?: () => void;
}

export interface ShortcutGroup {
    category: string;
    shortcuts: ShortcutItem[];
}

const MOD = MOD_LABEL;

const viewShortcuts = (label: string, key: string): ShortcutItem => ({
    label,
    keys: ['Alt', key],
    description: `Switch to ${label.toLowerCase()}`,
    global: true,
});

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        category: 'View Switching',
        shortcuts: [
            viewShortcuts('Inbox', '1'),
            viewShortcuts('Notes', '2'),
            viewShortcuts('Connections', '3'),
            viewShortcuts('Settings', ','),
        ],
    },
    {
        category: 'Notes & Editor',
        shortcuts: [
            {label: 'New Note', keys: [MOD, 'N'], description: 'Create a new note', global: true},
            {label: 'Save Note', keys: [MOD, 'S'], description: 'Save the current note', global: true},
            {label: 'Save Note', keys: [MOD, 'Enter'], description: 'Save the current note', global: true},
            {label: 'Paste to Capture', keys: [MOD, 'V'], description: 'Open quick capture with clipboard content', global: true},
            {label: 'Undo', keys: [MOD, 'Z'], description: 'Undo last change', global: true},
            {label: 'Redo', keys: [MOD, 'Shift', 'Z'], description: 'Redo last undone change', global: true},
            {label: 'Add Detail', keys: [MOD, 'Shift', 'P'], description: 'Open the property palette', global: true},
            {label: 'Previous Note', keys: ['Alt', '↑'], description: 'Navigate to the previous note'},
            {label: 'Next Note', keys: ['Alt', '↓'], description: 'Navigate to the next note'},
            {label: 'Back to List', keys: ['Alt', '←'], description: 'Return to the notes list'},
        ],
    },
    {
        category: 'Search & Commands',
        shortcuts: [
            {label: 'Command Palette', keys: [MOD, 'K'], description: 'Search notes and run commands', global: true},
            {label: 'Search Notes', keys: [MOD, '/'], description: 'Focus the sidebar search', global: true},
            {label: 'Toggle Sidebar', keys: [MOD, '\\'], description: 'Show or hide the sidebar', global: true},
        ],
    },
    {
        category: 'Help & Meta',
        shortcuts: [
            {label: 'Show This Help', keys: ['?'], description: 'Open keyboard shortcuts help', global: true},
            {label: 'Close Dialog', keys: ['Esc'], description: 'Close any open modal or dialog', global: true},
        ],
    },
];

export const COMMAND_PALETTE_SHORTCUTS: ShortcutGroup[] = [
    {
        category: 'Navigation',
        shortcuts: [
            {label: 'Command Palette', keys: [MOD, 'K']},
            {label: 'Search Notes', keys: [MOD, '/']},
            {label: 'Toggle Sidebar', keys: [MOD, '\\']},
            {label: 'Switch View', keys: ['Alt', '1–3']},
        ],
    },
    {
        category: 'Editing',
        shortcuts: [
            {label: 'New Note', keys: [MOD, 'N']},
            {label: 'Save Note', keys: [MOD, 'S']},
            {label: 'Save Note', keys: [MOD, 'Enter']},
            {label: 'Paste to Capture', keys: [MOD, 'V']},
            {label: 'Undo', keys: [MOD, 'Z']},
            {label: 'Redo', keys: [MOD, 'Shift', 'Z']},
            {label: 'Property Palette', keys: [MOD, 'Shift', 'P']},
            {label: 'Previous Note', keys: ['Alt', '↑']},
            {label: 'Next Note', keys: ['Alt', '↓']},
        ],
    },
    {
        category: 'Help',
        shortcuts: [
            {label: 'Open Help', keys: ['?']},
            {label: 'Close', keys: ['Esc']},
        ],
    },
];
