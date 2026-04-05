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

// Agent hooks
export { useAgentStatus } from './agent/useAgentStatus.js';
export { useCommands } from './agent/useCommands.jsx';

// Editor hooks
export { useEditorActions } from './editor/useEditorActions.ts';
export { EditorActionsProvider } from './editor/useEditorActions.tsx';
export { useEditorLogic } from './editor/useEditorLogic.js';
export { useEditorMagic } from './editor/useEditorMagic.js';
export { useEditorModals } from './editor/useEditorModals.js';
export { useEditorPublishing } from './editor/useEditorPublishing.js';
export { useEditorShortcuts } from './editor/useEditorShortcuts.js';
export { useEditorTemplates } from './editor/useEditorTemplates.js';
export { useInsertMenuItems } from './editor/useInsertMenuItems.js';
export { useOptimizedNoteEditing } from './editor/useOptimizedNoteEditing.js';
export { useOptimizedPropertyExtraction } from './editor/usePerformanceOptimizedEditor.js';
export { usePropertyInsertion } from './editor/usePropertyInsertion.js';
export { useSmartInput } from './editor/useSmartInput.js';

// Network hooks
export { useMatchDiscovery } from './network/useMatchDiscovery.js';
export { useNetworkActions } from './network/useNetworkActions.js';
export { useNetworkDiscovery } from './network/useNetworkDiscovery.js';
export { useNetworkView } from './network/useNetworkView.js';
export { useNostrProfile } from './network/useNostrProfile.js';
export { useNostrSubscription } from './network/useNostrSubscription.js';
export { useNostrSync } from './network/useNostrSync.js';
export { usePublish } from './network/usePublish.js';

// Ontology hooks
export { useAutoTagging } from './ontology/useAutoTagging.js';
export { useGardener } from './ontology/useGardener.js';
export { useNoteAnalysis } from './ontology/useNoteAnalysis.js';
export { useOntologyIndex } from './ontology/useOntologyIndex.js';
export { useOntologyMatching } from './ontology/useOntologyMatching.js';
export { useOntologySuggestions } from './ontology/useOntologySuggestions.js';
export { useOntologyView } from './ontology/useOntologyView.js';

// Other root hooks
export { useChat } from './useChat.js';
export { useChatNotifications } from './useChatNotifications.js';
export { useChatView } from './useChatView.js';
export { useContacts } from './useContacts.js';
export { useDebouncedSave } from './useDebouncedSave.js';
export { useFilteredNotes } from './useFilteredNotes.js';
export { useKeyboardShortcuts } from './useKeyboardShortcuts.js';
export { useLocalForage } from './useLocalForage.js';
export { useMapView } from './useMapView.js';
export { useMetaprogramming } from './useMetaprogramming.js';
export { useNoteActions } from './useNoteActions.js';
export { useNotesView } from './useNotesView.js';
export { useSettingsView } from './useSettingsView.js';
export { useTimelineEvents } from './useTimelineEvents.js';
export { useToast } from './useToast.js';
export { useUrlRouting } from './useUrlRouting.js';
