/**
 * Shared command metadata for functional parity between UI and CLI.
 */

export interface CommandDefinition {
    id: string;
    label: string;
    description?: string;
    shortcut?: string;
    icon?: string;
}

export const SHARED_COMMANDS: Record<string, CommandDefinition> = {
    NEW_NOTE: {
        id: 'new-note',
        label: 'New Note',
        description: 'Create a new semantic note',
        shortcut: 'Mod+N',
        icon: 'plus'
    },
    DASHBOARD: {
        id: 'dashboard',
        label: 'Go to Dashboard',
        description: 'View your overview and quick actions',
        icon: 'home'
    },
    NOTES_LIST: {
        id: 'notes',
        label: 'Go to Notes',
        description: 'Browse all your notes',
        icon: 'note'
    },
    MAP: {
        id: 'map',
        label: 'Go to Map',
        description: 'View notes on a map',
        icon: 'map'
    },
    NETWORK: {
        id: 'network',
        label: 'Go to Network',
        description: 'Explore the P2P semantic network',
        icon: 'network'
    },
    ONTOLOGY: {
        id: 'ontology',
        label: 'Go to Ontology',
        description: 'View and manage your semantic schema',
        icon: 'ontology'
    },
    CHAT: {
        id: 'chat',
        label: 'Go to Chat',
        description: 'Communicate with peers and agents',
        icon: 'chat'
    },
    SETTINGS: {
        id: 'settings',
        label: 'Go to Settings',
        description: 'Configure application and networks',
        icon: 'settings'
    },
    TRASH: {
        id: 'trash',
        label: 'Go to Trash',
        description: 'View and restore deleted notes',
        icon: 'trash'
    },
    HELP: {
        id: 'help',
        label: 'Open Help',
        description: 'View shortcuts and documentation',
        icon: 'help'
    }
} as const;
