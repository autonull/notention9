import type { SeamRole } from '@notention/core/ui/strategy';
import type { Step, Target } from '../journey.js';
import type { ParamDef } from '@notention/core/ui/strategy.js';
import {
    EDGE_TYPES,
    HYPEREDGE_TYPES,
    NODE_TYPES,
    STATUS_VALUES,
    CONFIDENCE_VALUES,
    REVERSIBILITY_VALUES,
    EFFECT_RISK_VALUES,
    STEP_KIND_VALUES,
    VARIANT_STATUS_VALUES,
    SEAM_ROLE_VALUES,
} from './constants.js';

export const UISG_SCHEMA_VERSION = 4 as const;

export type UisgStatus = (typeof STATUS_VALUES)[number];
export type UisgNodeType = (typeof NODE_TYPES)[number];
export type UisgEdgeType = (typeof EDGE_TYPES)[number];
export type UisgHyperedgeType = (typeof HYPEREDGE_TYPES)[number];
export type UisgConfidence = (typeof CONFIDENCE_VALUES)[number];
export type UisgRisk = 'normal' | 'caution' | 'destructive';
export type UisgStepKind = (typeof STEP_KIND_VALUES)[number];
export type UisgAction = Extract<Step, { kind: 'act' }>['action'];
export type UisgReversibility = (typeof REVERSIBILITY_VALUES)[number];
export type UisgEffectRisk = (typeof EFFECT_RISK_VALUES)[number];

export interface UisgBaseNode {
    id: string;
    name: string;
    status: UisgStatus;
    summary?: string;
    source?: string[];
    confidence?: UisgConfidence;
}

export interface UisgIntent extends UisgBaseNode {
    type: 'intent';
    actor?: string;
    outcome?: string;
}

export interface UisgCapability extends UisgBaseNode {
    type: 'capability';
    seam?: SeamRole;
    strategy?: string;
    skill?: string;
    risk?: UisgRisk;
    effect?: string;
}

export interface UisgFlow extends UisgBaseNode {
    type: 'flow';
    entry: string;
    outcome: string;
    journey?: string;
}

export interface UisgStep extends UisgBaseNode {
    type: 'step';
    kind: UisgStepKind;
    target?: Target;
    action?: UisgAction;
    value?: string;
    statePath?: string;
    stateEquals?: unknown;
    guard?: string;
}

export type SurfaceVariantStatus = 'experimental' | 'candidate' | 'promoted' | 'archived';

export interface VariantMetrics {
    bundleKb?: number;
    f1?: number;
    taskTimeMs?: number;
    visualPass?: boolean;
}

export interface SurfaceVariant {
    template?: string;
    propsSchema?: Record<string, ParamDef>;
    strategyOverrides?: Partial<Record<SeamRole, string>>;
    description: string;
    status: SurfaceVariantStatus;
    promotedAt?: string;
    metrics?: VariantMetrics;
}

export interface UisgSurface extends UisgBaseNode {
    type: 'surface';
    component?: string;
    route?: string;
    configKey?: string;
    seam?: SeamRole;
    template?: string;
    propsSchema?: Record<string, ParamDef>;
    generatedFrom?: string;
    variants?: Record<string, SurfaceVariant>;
    defaultVariant?: string;
}

export interface UisgPredicate extends UisgBaseNode {
    type: 'predicate';
    expression: string;
    registryId: string;
}

export interface UisgEffect extends UisgBaseNode {
    type: 'effect';
    reversibility: UisgReversibility;
    risk: UisgEffectRisk;
    confirmationRequired: boolean;
    failureModes: string[];
    registryId: string;
}

export type UisgNode = UisgIntent | UisgCapability | UisgFlow | UisgStep | UisgSurface | UisgPredicate | UisgEffect;

export interface UisgEdge {
    from: string;
    type: UisgEdgeType;
    to: string;
    when?: string;
    notes?: string;
    weight?: number;
    confidence?: UisgConfidence;
}

export interface UisgHyperedge {
    id: string;
    type: UisgHyperedgeType;
    nodes: string[];
    roles?: Record<string, string>;
    when?: string;
    notes?: string;
    weight?: number;
    confidence?: UisgConfidence;
}

export interface UisgGraph {
    version: number;
    nodes: UisgNode[];
    edges: UisgEdge[];
    hyperedges: UisgHyperedge[];
}
