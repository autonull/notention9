/**
 * Node.js entry point for @notention/core
 * Includes all modules including Node.js-only eval and telemetry
 */

export * from './index.js';

// Eval & Telemetry
export * from './eval/caseManifest.js';
export * from './eval/verdict.js';
export * from './eval/quality.js';
// Ledger exports (exclude types that conflict with revisionStore)
export { 
    Ledger, 
    logEvent, 
    queryLedger, 
    getRunEvents, 
    exportRun, 
    pruneLedger,
    type LedgerEvent,
    type LedgerEventType,
    type LedgerPayload,
    type RunConfig,
    type RunSummary,
    type CaseVerdict as LedgerCaseVerdict,
    type VerdictDetail,
    type ResolutionReason,
    type Revision as LedgerRevision,
} from './telemetry/ledger.js';
// RevisionStore exports (exclude types that conflict with ledger)
export { 
    RevisionStore, 
    getRevisionStore, 
    resetRevisionStore,
    type Revision,
    type StrategyArtifact,
    type RevisionStatus,
    type RevisionStoreConfig,
} from './telemetry/revisionStore.js';