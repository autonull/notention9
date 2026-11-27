export const EDGE_TYPES = [
    'supports', 'uses', 'invokes', 'contains', 'renders',
    'next', 'alternative', 'implementedBy', 'guards', 'effects',
    'composes', 'requires', 'provides', 'satisfies',
    'dependsOn', 'conflicts', 'excludes',
    'fallback', 'precedes', 'parallel',
    'variantOf', 'overrides',
    'evidencedBy', 'documents', 'owns', 'tests',
] as const;

export const HYPEREDGE_TYPES = [
    'requiresAll', 'requiresAny',
    'composition', 'parallelSet',
    'alternativeSet', 'conflictSet',
    'journeyBundle', 'variantSet',
] as const;

export const HYPEREDGE_MIN_NODES: Record<(typeof HYPEREDGE_TYPES)[number], number> = {
    requiresAll: 2,
    requiresAny: 2,
    composition: 2,
    parallelSet: 2,
    alternativeSet: 2,
    conflictSet: 2,
    journeyBundle: 2,
    variantSet: 1,
};

export const NODE_TYPES = [
    'intent', 'capability', 'flow', 'step', 'surface', 'predicate', 'effect',
] as const;

export const STATUS_VALUES = [
    'implemented', 'partial', 'planned', 'candidate', 'experimental', 'removed', 'rejected',
] as const;

export const CONFIDENCE_VALUES = [
    'high', 'medium', 'low',
] as const;

export const REVERSIBILITY_VALUES = [
    'reversible', 'compensatable', 'irreversible', 'unknown',
] as const;

export const EFFECT_RISK_VALUES = [
    'normal', 'caution', 'destructive', 'consequential',
] as const;

export const STEP_KIND_VALUES = [
    'show', 'action', 'choice', 'confirm', 'result',
] as const;

export const VARIANT_STATUS_VALUES = [
    'experimental', 'candidate', 'promoted', 'archived',
] as const;

export const SEAM_ROLE_VALUES = [
    'capture', 'elicit', 'match', 'display', 'layout', 'explain', 'ontology', 'intent', 'render',
] as const;