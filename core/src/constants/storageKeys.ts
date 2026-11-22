export const STORAGE_KEYS = {
    notes: 'notention-notes',
    settings: 'notention-settings-v2',
    sortOrder: 'notention-sort-order',
    sidebarViewMode: 'notention-sidebar-view-mode',
    suggestions: 'notention-suggestions',
    schemaVersion: 'notention-schema-version',
    envelope: 'notention-envelope',
    notesSection: 'notention-notes-section',
    notesMode: 'notention-notes-mode',
    notesGroup: 'notention-notes-group',
    historyShare: 'notention-history-share',
    contextShare: 'notention-context-share',
    contextOpen: 'notention-context-open',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];