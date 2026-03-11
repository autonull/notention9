/**
 * Context Hooks
 * 
 * Provide type-safe access to React context values with proper error handling.
 * These hooks ensure contexts are used within their providers.
 */

export { useNotes } from './useNotes.js';
export { useSettings } from './useSettingsContext.js';
export { useView } from './useViewContext.js';

// Re-export for convenience
export type { NotesContextValue } from '../components/contexts/NotesContext.js';
export type { SettingsContextValue } from '../components/contexts/SettingsContext.js';
export type { ViewContextValue } from '../components/contexts/ViewContext.js';
