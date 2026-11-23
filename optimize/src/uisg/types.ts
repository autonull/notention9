import type { SeamRole } from '@notention/core/ui/strategy';
import type { Step, Target } from '../journey.js';

export type UisgStatus = 'existing' | 'partial' | 'planned' | 'idea' | 'removed';
export type UisgNodeType = 'intent' | 'capability' | 'flow' | 'step' | 'surface';
export type UisgEdgeType =
    | 'supports' | 'uses' | 'invokes' | 'contains' | 'renders'
    | 'next' | 'alternative' | 'implementedBy';
export type UisgConfidence = 'high' | 'medium' | 'low';
export type UisgRisk = 'normal' | 'caution' | 'destructive';
export type UisgStepKind = 'show' | 'action' | 'choice' | 'confirm' | 'result';
export type UisgAction = Extract<Step, { kind: 'act' }>['action'];

interface UisgBaseNode {
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
}

export interface UisgSurface extends UisgBaseNode {
    type: 'surface';
    component?: string;
    route?: string;
    configKey?: string;
    seam?: SeamRole;
}

export type UisgNode = UisgIntent | UisgCapability | UisgFlow | UisgStep | UisgSurface;

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
