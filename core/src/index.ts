export * from './types/index.js';

// Domain barrels
export * from './notes/index.js';
export * from './matching/index.js';
export * from './ontology/index.js';
export * from './network/index.js';
export * from './routing/index.js';
export * from './skills/index.js';
export * from './extraction/index.js';
export * from './constants/index.js';
export * from './tracing/index.js';
export * from './prompts/index.js';
export * from './policy/index.js';
export * from './identity/index.js';
export { DEFAULT_ONTOLOGY } from './ontology/ontology.default.js';
export { OntologyService } from './ontology/ontologyService.js';

// Utils
export * from './utils/index.js';

export * from './patternRecognition/index.js';
export * from './security/index.js';
export * from './config/index.js';
export * from './templates/index.js';
export * from './export/index.js';
export * from './storage/index.js';
// Telemetry: explicit exports to avoid duplicates
// Runtime classes/functions only - types moved to type-only section below
export { 
    Ledger, 
    logEvent, 
    queryLedger, 
    getRunEvents, 
    exportRun, 
    pruneLedger,
    logMatchAccepted,
    logMatchWithdrawn,
    logMatchRejected
} from './telemetry/ledger.js';
export { 
    RevisionStore, 
    getRevisionStore, 
    resetRevisionStore 
} from './telemetry/revisionStore.js';
export { 
    JSONLRevisionDriver, 
    InMemoryRevisionDriver, 
    SQLiteRevisionDriver, 
    revisionDriverRegistry,
    getRevisionDriverRegistry,
    resetRevisionDriverRegistry
} from './telemetry/revisionDriver.js';
export { 
    Journal, 
    getJournal, 
    resetJournal, 
    recordFriction, 
    getFrictionSignals, 
    generateFrictionDigest,
    getFrictionCounts
} from './telemetry/journal.js';
export * from './fixtures/index.js';
export * from './feedback/index.js';

// Type-only exports for types that are not runtime values
export type { 
    DurationBucket, 
    EvidenceClass, 
    FrictionEvent, 
    FrictionAggregate, 
    FrictionSignal, 
    JournalConfig, 
    FrictionKind 
} from './telemetry/frictionUtils.js';
export type { 
    LedgerEvent, 
    LedgerEventType, 
    LedgerPayload, 
    RunConfig, 
    RunSummary, 
    VerdictDetail, 
    ResolutionReason 
} from './telemetry/types.js';
export type { 
    Revision, 
    StrategyArtifact, 
    RevisionStatus, 
    RevisionStoreConfig 
} from './telemetry/revisionStore.js';
export type { 
    RevisionDriverConfig,
    RevisionSearchQuery 
} from './telemetry/revisionDriver.js';

// New extensibility modules
export * from './ontology/index.js';
export * from './suggestions/index.js';
// test-utils is deliberately NOT re-exported here: it imports vitest, and this
// barrel is the entry point of the shipped bundle. Test helpers stay behind the
// dedicated '@notention/core/test-utils' subpath export.
export * from './validation/index.js';
export * from './config.js';
export * from './events/index.js';

// UI exports
export * from './ui/index.js';

// Optimizer exports
export * from './optimizer/index.js';

// Schemas exports
export * from './schemas/index.js';

// Nostr-specific (keep separate for optional dependency)
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