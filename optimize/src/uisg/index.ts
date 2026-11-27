// Types
export * from './types.js';
export * from './validate.js';
export * from './query.js';
export * from './analyze.js';
export * from './toJourney.js';
export * from './skeleton.js';
export * from './simulate.js';
export * from './registry.js';
export * from './manifest.js';
export * from './scan.js';
export * from './sync.js';
export * from './metrics.js';
export * from './rank.js';

// Select exports (avoid ContextProfile conflict with contexts.js)
export { selectFeature, loadSelection, type SelectionRequest, type SelectionResult, type SelectionConflict } from './select.js';

// Contexts exports (avoid ContextProfile conflict with select.js)
export { ensureContextsFile, listProfiles, loadContexts, getProfile, CONTEXTS_SCHEMA_VERSION, type ContextsData, type ContextProfile, type ContextDensity, type ContextModality } from './contexts.js';

export * from './themes.js';

export { adoptFlow, type AdoptOptions, type AdoptResult } from './adopt.js';
export * from './canonicalize.js';
export * from './variants.js';
export * from './matrix.js';
export * from './diff.js';

// Records exports (avoid FindingStatus conflict with finding.js, Provenance conflict with synthesis)
export { appendRunRecord, loadRuns, loadDecisions, loadFindings, markFindingFixed, verifyFinding, transitionLifecycle, updateImplementationStatus, type LifecycleTransition, type DecisionRecord, type RunRecord, type FindingRecord, type EvidenceBundle as UisgEvidenceBundle, type Provenance as UisgProvenance, type LifecycleStatus, type ImplementationStatus, type EvidenceSource, type FindingStatus as UisgFindingStatus, type NodeRecord } from './records.js';

// Compare exports (avoid EvidenceBundle conflict with evidence.js, loadBundle conflict with replay.js)
export { compareBundles, loadBundle as loadUisgBundle, type BundleSummary, type BundleComparison } from './compare.js';