/**
 * React Hooks for Notention UI
 * 
 * Organized by category:
 * - context: Context access hooks (useNotes, useSettings, useView)
 * - data: Data management hooks (useNotesData, augmentNote)
 * - logging: Logging utilities (useLogger, createScopedLogger)
 * - feature: Feature-specific hooks (grouped by functionality)
 */

// Context hooks
export { useNotes, useSettings, useView } from './context.js';
export type {
    NotesContextValue,
    SettingsContextValue,
    ViewContextValue
} from './context.js';

// Data hooks
export { useNotesData, augmentNote } from './data/index.js';
export type { UseNotesDataResult, NoteMetadata } from './data/index.js';

// Logging hooks
export { useLogger, createScopedLogger } from './logging.js';

// Feature hooks (alphabetically sorted)
export { useAgentStatus } from './useAgentStatus.js';
export { useAutoTagging } from './useAutoTagging.js';
export { useBackgroundMatcher } from './useBackgroundMatcher.js';
export { useChat } from './useChat.js';
export { useChatNotifications } from './useChatNotifications.js';
export { useChatView } from './useChatView.js';
export { useCommands } from './useCommands.jsx';
export { useContacts } from './useContacts.js';
export { useDebouncedSave } from './useDebouncedSave.js';
export { useEditorActions } from './useEditorActions.js';
export { useEditorLogic } from './useEditorLogic.js';
export { useEditorMagic } from './useEditorMagic.js';
export { useEditorModals } from './useEditorModals.js';
export { useEditorPublishing } from './useEditorPublishing.js';
export { useEditorShortcuts } from './useEditorShortcuts.js';
export { useEditorTemplates } from './useEditorTemplates.js';
export { useEventSubscription } from './useEventSubscription.js';
export { useFilteredNotes } from './useFilteredNotes.js';
export { useGardener } from './useGardener.js';
export { useInsertMenuItems } from './useInsertMenuItems.js';
export { useKeyboardShortcuts } from './useKeyboardShortcuts.js';
export { useLocalForage } from './useLocalForage.js';
export { useMapView } from './useMapView.js';
export { useMatches } from './useMatches.js';
export { useMetaprogramming } from './useMetaprogramming.js';
export { useNetworkActions } from './useNetworkActions.js';
export { useNetworkDiscovery } from './useNetworkDiscovery.js';
export { useNetworkMatching } from './useNetworkMatching.js';
export { useNetworkView } from './useNetworkView.js';
export { useNostrProfile } from './useNostrProfile.js';
export { useNetworkManagement } from './useNetworkManagement.js';
export { useNoteActions } from './useNoteActions.js';
export { useNoteAnalysis } from './useNoteAnalysis.js';
export { useNotesView } from './useNotesView.js';
export { useOntologyIndex } from './useOntologyIndex.js';
export { useOntologyMatching } from './useOntologyMatching.js';
export { useOntologySuggestions } from './useOntologySuggestions.js';
export { useOntologyView } from './useOntologyView.js';
export { useOptimizedNoteEditing } from './useOptimizedNoteEditing.js';
export { usePerformanceOptimizedEditor } from './usePerformanceOptimizedEditor.js';
export { usePropertyInsertion } from './usePropertyInsertion.js';
export { usePublish } from './usePublish.js';
export { useSettingsView } from './useSettingsView.js';
export { useSmartInput } from './useSmartInput.js';
export { useTimelineEvents } from './useTimelineEvents.js';
export { useToast } from './useToast.js';
export { useUrlRouting } from './useUrlRouting.js';
