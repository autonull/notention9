export const STORAGE_KEYS = {
    notes: 'notention-notes',
    settings: 'notention-settings-v2',
    sortOrder: 'notention-sort-order',
    sidebarViewMode: 'notention-sidebar-view-mode',
    suggestions: 'notention-suggestions',
    schemaVersion: 'notention-schema-version',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];