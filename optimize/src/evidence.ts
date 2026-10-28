import { z } from 'zod';
import type { SemanticState } from './state.js';

export interface EvidenceBundle {
    runId: string;
    journeyId: string;
    startedAt: string;
    completedAt: string;
    status: 'passed' | 'failed';
    steps: Array<{ index: number; kind: string; label?: string; startedAt: string; durationMs: number; ok: boolean; error?: string; ariaSnapshot?: string; screenshot?: string; stateSnapshot?: unknown }>;
    snapshots: Array<{ label: string; state: SemanticState; aria: string; screenshot?: Buffer }>;
    console: Array<{ type: string; text: string; location?: string }>;
    network: Array<{ method: string; url: string; status?: number; blocked: boolean }>;
    promptTraces: Array<any>;
    actionTraces: Array<any>;
    assertions: Array<{ id: string; ok: boolean; expected?: unknown; actual?: unknown; message?: string }>;
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

// Re-export writeBundle from reporter
export { writeBundle } from './reporter.js';

// Re-export replay functions
export { loadBundle, verifyReplay, updateFindingStatus } from './replay.js';

// Re-export a11y
export * from './a11y.js';