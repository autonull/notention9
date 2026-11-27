/**
 * @notention/test-utils - Unified test utilities
 * 
 * Consolidates test utilities from:
 * - @notention/core/test-utils (mock factories, test setup)
 * - ui/src/tests/utils (UI-specific test helpers)
 * 
 * Provides:
 * - Mock factories for core types (Note, Property, Strategy, etc.)
 * - Test environment setup/cleanup
 * - Assertion helpers
 * - Playwright fixtures (via ./playwright)
 * - Vitest utilities (via ./vitest)
 */

// Core mock factories
export {
    createMockOntology,
    createMockNote,
    createMockProperty,
    createMockSeam,
    createMockStrategy,
    createMockNoteSource,
    assertPropertyMatch,
    DEFAULT_ONTOLOGY,
    isMockNote,
    createMockAttribute,
    withTimeout,
    createMockNotes,
    createMockProperties,
} from './coreMocks.js';

// Test environment setup
export {
    setupTestEnvironment,
    cleanupTestEnvironment,
    initMemoryGuard,
    withMemoryGuard,
    MEMORY_THRESHOLD_MB,
    MEMORY_THRESHOLD_BYTES,
} from './testSetup.js';

// UI test helpers
export {
    createTestNote,
    createTestProperty,
    defaultTestNote,
} from './uiTestHelpers.js';

// Type re-exports for convenience
export type { Note, Property, NoteSource, PrivacyLevel, OntologyNode, OntologyAttribute, Seam } from './coreMocks.js';