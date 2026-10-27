import { z } from 'zod';
import type { SemanticState } from './state.js';

export interface EvidenceBundle {
    runId: string;
    journey: { id: string; version: number; intent: string };
    repo: { gitRev: string; dirty: boolean };
    env: { uiUrl: string; reportOnly: true };
    prompts: Record<string, string>;
    steps: Array<{ index: number; kind: string; label?: string; startedAt: string; durationMs: number }>;
    snapshots: Array<{ label: string; aria: string; shot: string; state: SemanticState }>;
    traces: { prompt: PromptTrace[]; action: ActionTrace[] };
    console: Array<{ type: string; text: string; location?: string }>;
    network: Array<{ method: string; url: string; status?: number; blocked: boolean }>;
    assertions: Array<{ id: string; ok: boolean; expected?: unknown; actual?: unknown; message?: string }>;
    metrics: { stepCount: number; durationMs: number; consoleErrors: number; failedAssertions: number };
}

export interface PromptTrace {
    runId?: string;
    promptId: string;
    version: string;
    input: unknown;
    context?: Record<string, unknown>;
    output: unknown;
    parsed?: unknown;
    confidence: number | null;
    durationMs: number;
    outcome: 'applied' | 'suggested' | 'rejected' | 'invalid' | 'refused';
    uiSurface: string;
}

export interface ActionTrace {
    runId?: string;
    source: 'ui' | 'agent' | 'cli' | 'optimize';
    intent: string;
    toolCalls?: Array<{ name: string; phase: 'request' | 'result' | 'blocked' }>;
    stateChanges?: Array<{ path: string; from?: unknown; to?: unknown }>;
    validationFailures?: Array<{ field: string; message: string }>;
    confirmations?: Array<{ action: string; outcome: 'requested' | 'granted' | 'cancelled' }>;
    outcome: 'ok' | 'blocked' | 'failed' | 'requires_confirmation';
}

// Use custom validator functions to avoid Zod inference issues
const SnapshotSchema = z.custom<{ label: string; aria: string; shot: string; state: SemanticState }>();

const PromptTraceSchema = z.custom<PromptTrace>();

const ActionTraceSchema = z.custom<ActionTrace>();

export const EvidenceBundleSchema = z.custom<EvidenceBundle>();

export function validateEvidenceBundle(bundle: unknown): EvidenceBundle {
    return EvidenceBundleSchema.parse(bundle);
}