// Browser-safe entry point for @notention/core
// Explicit named exports to ensure Rollup/Vite can follow them

// Types
export * as types from './types/index.js';

// Domain barrels
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
export { DEFAULT_ONTOLOGY } from './ontology/ontology.default.js';
export { OntologyService } from './ontology/ontologyService.js';

// Utils
export * as utils from './utils/index.js';
export * as patternRecognition from './patternRecognition/index.js';
export * as security from './security/index.js';
export * as config from './config.browser.js';
export * as noteBasedConfig from './config/NoteBasedConfig.js';
export * as storage from './storage/Storage.browser.js';
export * as recovery from './storage/recovery.js';
export * as templates from './templates/index.js';
export * as fixtures from './fixtures/index.js';
export * as feedback from './feedback/index.js';

// New extensibility modules
export * as suggestions from './suggestions/SuggestionStore.browser.js';
export * as testUtils from './test-utils/index.js';
export * as validation from './validation/index.js';
export * as events from './events/index.js';

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