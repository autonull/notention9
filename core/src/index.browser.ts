/**
 * Browser-safe entry point for @notention/core
 * Excludes Node.js-only modules (eval, telemetry, storage, etc.)
 */

export * from './types/index.js';

// Domain barrels (browser-safe)
export * from './notes/index.js';
export * from './matching/index.js';
export * from './ontology/index.js';
export * from './network/index.js';
export * from './skills/index.js';
export * from './extraction/index.js';
export * from './constants/index.js';
export * from './tracing/index.js';
export * from './prompts/index.js';
export * from './policy/index.js';
export { DEFAULT_ONTOLOGY } from './ontology/ontology.default.js';
export { OntologyService } from './ontology/ontologyService.js';

// Utils (browser-safe)
export * from './utils/index.js';

export * from './patternRecognition/index.js';
export * from './security/index.js';
export * from './config/index.js';
export * from './templates/index.js';
export * from './fixtures/index.js';
export * from './feedback/index.js';

// New extensibility modules (browser-safe)
export * from './ontology/index.js';
export * from './suggestions/index.js';
export * from './test-utils/index.js';
export * from './validation/index.js';
export * from './config.js';
export * from './events/index.js';

// UI (browser-safe)
export * from './ui/index.js';

// Nostr-specific (browser-safe, optional dependency)
export * from './network/nostr/nostr.js';
export * from './network/nostr/privacy.js';
export * from './network/nostr/discovery.js';
export * from './network/nostr/relay.js';
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