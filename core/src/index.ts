export * from './types/index.js';

// Domain barrels
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

// Utils
export * from './utils/errors/index.js';
export * from './utils/common.js';
export * from './utils/logging.js';
export * from './utils/encoding.js';
export * from './utils/string.js';
export * from './utils/tools.js';
export * from './utils/commands.js';
export * from './utils/csvExport.js';
export * from './utils/baseService.js';
export * from './utils/inference.js';
export * from './utils/matching.js';
export * from './utils/html.js';
export * from './utils/dateParsing.js';
export * from './utils/constants.js';
export * from './utils/geo.js';
export * from './utils/index.js';

export * from './patternRecognition/index.js';
export * from './security/index.js';
export * from './config/index.js';
export * from './templates/index.js';
export * from './export/index.js';
export * from './storage/index.js';
// Telemetry: explicit exports to avoid duplicates
export { 
    Ledger, 
    LedgerEvent, 
    LedgerEventType, 
    LedgerPayload, 
    RunConfig, 
    RunSummary, 
    // CaseVerdict is also defined in eval/verdict.ts - export from there instead
    VerdictDetail, 
    ResolutionReason,
    logEvent, 
    queryLedger, 
    getRunEvents, 
    exportRun, 
    pruneLedger 
} from './telemetry/ledger.js';
export { 
    RevisionStore, 
    Revision, 
    StrategyArtifact, 
    RevisionStatus, 
    RevisionStoreConfig, 
    getRevisionStore, 
    resetRevisionStore 
} from './telemetry/revisionStore.js';
export { 
    RevisionDriver, 
    JSONLRevisionDriver, 
    InMemoryRevisionDriver, 
    SQLiteRevisionDriver, 
    revisionDriverRegistry,
    getRevisionDriverRegistry,
    resetRevisionDriverRegistry,
    type RevisionDriverConfig,
    type RevisionSearchQuery
} from './telemetry/revisionDriver.js';
export { 
    Journal, 
    FrictionEvent, 
    FrictionAggregate, 
    FrictionSignal, 
    JournalConfig, 
    FrictionKind, 
    DurationBucket, 
    EvidenceClass,
    getJournal, 
    resetJournal, 
    recordFriction, 
    getFrictionSignals, 
    generateFrictionDigest 
} from './telemetry/journal.js';
export * from './fixtures/index.js';
export * from './feedback/index.js';

// New extensibility modules
export * from './ontology/index.js';
export * from './suggestions/index.js';
export * from './test-utils/index.js';
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