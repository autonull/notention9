// Generate proper ESM re-export for @notention/core browser entry
// This script is run after the core build

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const content = `// Proper ESM re-export for @notention/core main entry
// This file is generated - do not edit directly
// Only re-exports from actual entry points in browserEntries

// Domain barrels
export * from './notes/index.js';
export * from './matching/index.js';
export * from './ontology/index.js';
export * from './network/index.js';
export * from './skills/index.js';
export * from './extraction/index.js';
export * from './constants/index.js';
export * from './constants/seams.js';
export * from './tracing/index.js';
export * from './prompts/index.js';
export * from './policy/index.js';
export * from './export/index.js';

// Utils
export * from './utils/index.js';
export * from './utils/common.js';

// Fixtures
export * from './fixtures/index.js';

// Pattern recognition
export * from './patternRecognition/index.js';

// Nostr
export * from './network/nostr/nostr.js';
export * from './network/nostr/privacy.js';
export * from './network/nostr/discovery.js';
export * from './network/nostr/relay.js';
export * from './network/nostr/protocol.js';

// Export
export * from './export/index.js';

// Config
export * from './config.js';
export * from './config/NoteBasedConfig.js';

// Storage
export * from './storage/Storage.js';
export * from './storage/recovery.js';

// Templates
export * from './templates/index.js';

// Feedback
export * from './feedback/index.js';

// Security
export * from './security/index.js';

// Validation
export * from './validation/index.js';

// Extensibility modules
export * from './suggestions/SuggestionStore.js';
export * from './test-utils/index.js';
export * from './events/index.js';

// UI
export * from './ui/index.js';
export * from './ui/ProfileRegistry.js';
export * from './ui/profile.js';
export * from './ui/profileDefaults.js';
export * from './ui/strategy.js';

// Telemetry (browser stubs)
export * from './telemetry/journal.js';
export * from './telemetry/revisionStore.js';
export * from './telemetry/ledger.js';

// Schemas (generated)
export * from './schemas/generated/seam-definitions.js';

// Nostr protocol
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
`;

const outputPath = resolve('../core/dist/browser/index.js');
writeFileSync(outputPath, content);
console.log('Generated browser index.js re-export file');
