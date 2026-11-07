// Browser-safe entry point for @notention/core
// Explicit named exports to ensure Rollup/Vite can follow them
// This file is excluded from TypeScript type checking (see tsconfig.json)

import type {
    Contact,
    NostrEvent,
    NostrProfile,
    AppSettings,
    Template,
    View,
    OntologyNode,
    OntologyAttribute,
    Property,
    PropertyMatch,
    MatchResult,
    ScoredMatch,
    AgentStatus,
    MatchingService,
    NetworkGate,
    PrivacyError,
    SuggestedAttribute,
} from './schemas/index.js';

// Types
export * as types from './types/index.js';

// Domain barrels (namespace exports)
export * as notes from './notes/index.js';
export * as matching from './matching/index.js';
export * as ontology from './ontology/index.js';
export * as network from './network/index.js';
export * as skills from './skills/index.js';
export * as extraction from './extraction/index.js';
export * as constants from './constants/index.js';
export * as tracing from './tracing/index.js';
export * as prompts from './prompts/index.js';
export * as policy from './policy/index.js';
export * as exportModule from './export/index.js';

// Named re-exports for direct imports from '@notention/core'
// Utils - from utils/logging.js
export {
    Logger,
    logDebug,
    logInfo,
    logWarn,
    logError,
    log,
    error,
    getRootLogger,
} from './utils/logging.js';

// Utils - from utils/common.js
export {
    generateId,
} from './utils/common.browser.js';

// Utils - from utils/html.js
export {
    sanitizeHTML,
    getTextFromHtml,
    prettyPrintHtml,
} from './utils/html.js';

// Utils - from notes/index.js (re-exported from notes/parsing and notes/serialization)
export {
    parseProperties,
    parsePropertiesJson,
    propertyToHtml,
} from './notes/index.js';

// Utils - from utils/json.js
export {
    stripJsonFence,
} from './utils/json.js';

// Ontology - from ontology/index.js
export {
    collectOntologyKeys,
    findAttributeDef,
    getCanonicalKey,
    getAliases,
    buildAttributeIndex,
    findNode,
    findNodeWithAttribute,
    findNodeIdForAttribute,
    getSubtreeKeys,
    addAttribute,
    addAliasToAttribute,
    addNode,
    deleteNode,
    deleteAttribute,
    mergeAttributes,
    renameAttribute,
    renameNode,
    detectConflicts,
    buildWidgetMetadata,
} from './ontology/index.js';

export {
    DEFAULT_ONTOLOGY,
} from './ontology/ontology.default.js';

export {
    OntologyService,
} from './ontology/ontologyService.js';

// Extraction - from extraction/index.js
export {
    MatchEngine,
    PropertyExtractor,
    ExtractionPipeline,
    ExtractionPipelineResult,
} from './extraction/index.js';

// Notes - from notes/index.js
export {
    createNote,
    Note,
    NotePipeline,
    NOTE_STATUS,
    normalizeNoteProperties,
    NoteFilter,
    inferNoteIntent,
    replacePropertyInString,
    parseGeoFromValues,
    haversineDistance,
    GeoCoords,
    PrivacyLevel,
    SortOrder,
} from './notes/index.js';

// Tracing - from tracing/index.js
export {
    setTraceSink,
} from './tracing/index.js';

// Fixtures - from fixtures/index.js
export {
    buildDemoWorkspace,
    DEMO_NOTE_IDS,
} from './fixtures/index.js';

// Date parsing - from utils/dateParsing.js
export {
    parseNaturalDate,
    DATE_PROPERTY_KEYS,
} from './utils/dateParsing.js';

// Pattern recognition - from patternRecognition/index.js
export {
    patternRecognitionService,
    SuggestedAttribute,
} from './patternRecognition/index.js';

// Nostr - from network/nostr/nostr.js
export {
    DEFAULT_RELAYS,
    pool,
    resolveRelays,
    hexToBytes,
    convertEventToNote,
    publishNoteToNostr,
    extractPropertiesFromTags,
    formatPropertyTag,
    formatNpub,
    networkRegistry,
    NostrNetworkProvider,
    MeshtasticNetworkProvider,
    SEMANTIC_NOTE_KIND,
    queryEvents,
    getAliases as nostrGetAliases,
    getCanonicalKey as nostrGetCanonicalKey,
} from './network/nostr/nostr.js';

// Export - from export/index.js
export {
    SHARED_COMMANDS,
    buildSingleNoteExport,
    generateTemplatesFromOntology,
} from './export/index.js';

// Config - from config/NoteBasedConfig.js
export {
    mergeConfigs,
    parseConfigFromNote,
} from './config/NoteBasedConfig.js';

// Storage - from storage/recovery.js
export {
    storageRecovery,
} from './storage/recovery.js';

// Tools - from utils/tools.js
export {
    areNotesEqual,
} from './utils/tools.js';

// Security - from security/index.js
export {
    RobustWebSocket,
} from './security/index.js';

// Metaphor - from skills/metaphor/MetaphorRegistry.js
export {
    MetaphorRegistry,
    metaphorRegistry,
    metaphorMapper,
} from './skills/metaphor/MetaphorRegistry.js';

// Schemas - types only
export type {
    Contact,
    NostrEvent,
    NostrProfile,
    AppSettings,
    Template,
    View,
    OntologyNode,
    OntologyAttribute,
    Property,
    PropertyMatch,
    MatchResult,
    ScoredMatch,
    AgentStatus,
    MatchingService,
    NetworkGate,
    PrivacyError,
    SuggestedAttribute,
} from './schemas/index.js';

// Validation - from validation/index.js
export {
    validateAttributeValue,
} from './validation/index.js';

// New extensibility modules (namespace exports)
export * as suggestions from './suggestions/SuggestionStore.browser.js';
export * as testUtils from './test-utils/index.js';
export * as validation from './validation/index.js';
export * as events from './events/index.js';
export * as patternRecognition from './patternRecognition/index.js';
export * as security from './security/index.js';
export * as config from './config.browser.js';
export * as noteBasedConfig from './config/NoteBasedConfig.js';
export * as storage from './storage/Storage.browser.js';
export * as recovery from './storage/recovery.js';
export * as templates from './templates/index.js';
export * as fixtures from './fixtures/index.js';
export * as feedback from './feedback/index.js';

// UI
export * as ui from './ui/index.js';

// Nostr
export * as nostr from './network/nostr/nostr.js';
export * as nostrPrivacy from './network/nostr/privacy.js';
export * as nostrDiscovery from './network/nostr/discovery.js';
export * as nostrRelay from './network/nostr/relay.js';
export {
    PROTOCOL_VERSION,
    encodeEventToCBOR,
    decodeEventFromCBOR,
    computeNoteID,
    computeNoteIDFromSerialized,
    signEvent,
    verifyEventSignature,
    getPublicKeyFromSecret,
    generatePrivateKey,
    serializeEventForSigning,
    isValidEvent,
    verifiedSymbol,
} from './network/nostr/protocol.js';