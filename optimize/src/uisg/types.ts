import type { SeamRole } from '@notention/core/ui/strategy';
import type { Step, Target } from '../journey.js';
import type { ParamDef } from '@notention/core/ui/strategy.js';

export type UisgStatus = 'implemented' | 'partial' | 'planned' | 'candidate' | 'experimental' | 'removed' | 'rejected';
export type UisgNodeType = 'intent' | 'capability' | 'flow' | 'step' | 'surface' | 'predicate' | 'effect';
export type UisgEdgeType =
    | 'supports' | 'uses' | 'invokes' | 'contains' | 'renders'
    | 'next' | 'alternative' | 'implementedBy' | 'guards' | 'effects';
export type UisgConfidence = 'high' | 'medium' | 'low';
export type UisgRisk = 'normal' | 'caution' | 'destructive';
export type UisgStepKind = 'show' | 'action' | 'choice' | 'confirm' | 'result';
export type UisgAction = Extract<Step, { kind: 'act' }>['action'];
export type UisgReversibility = 'reversible' | 'compensatable' | 'irreversible' | 'unknown';
export type UisgEffectRisk = 'normal' | 'caution' | 'destructive' | 'consequential';

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

export interface UisgSurface extends UisgBaseNode {
    type: 'surface';
    component?: string;
    route?: string;
    configKey?: string;
    seam?: SeamRole;
    template?: string;
    propsSchema?: Record<string, ParamDef>;
    generatedFrom?: string;
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
}

export interface UisgGraph {
    version: number;
    nodes: UisgNode[];
    edges: UisgEdge[];
}
