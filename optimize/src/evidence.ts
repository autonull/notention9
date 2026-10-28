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
    input?: unknown;
    context?: Record<string, unknown>;
    output?: unknown;
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

const StepRecordSchema = z.object({
    index: z.number(),
    kind: z.string(),
    label: z.string().optional(),
    startedAt: z.string(),
    durationMs: z.number(),
    ok: z.boolean(),
    error: z.string().optional(),
    ariaSnapshot: z.string().optional(),
    screenshot: z.string().optional(),
    stateSnapshot: z.unknown().optional(),
});

const SnapshotSchema = z.object({
    label: z.string(),
    state: z.custom<SemanticState>(),
    aria: z.string(),
    screenshot: z.instanceof(Buffer).optional(),
});

const ConsoleEntrySchema = z.object({
    type: z.string(),
    text: z.string(),
    location: z.string().optional(),
});

const NetworkEntrySchema = z.object({
    method: z.string(),
    url: z.string(),
    status: z.number().optional(),
    blocked: z.boolean(),
});

const AssertionSchema = z.object({
    id: z.string(),
    ok: z.boolean(),
    expected: z.unknown().optional(),
    actual: z.unknown().optional(),
    message: z.string().optional(),
});

const PromptTraceSchema = z.object({
    runId: z.string().optional(),
    promptId: z.string(),
    version: z.string(),
    input: z.unknown(),
    context: z.record(z.unknown()).optional(),
    output: z.unknown(),
    parsed: z.unknown().optional(),
    confidence: z.number().nullable(),
    durationMs: z.number(),
    outcome: z.enum(['applied', 'suggested', 'rejected', 'invalid', 'refused']),
    uiSurface: z.string(),
}) satisfies z.ZodType<PromptTrace>;

const ActionTraceSchema = z.object({
    runId: z.string().optional(),
    source: z.enum(['ui', 'agent', 'cli', 'optimize']),
    intent: z.string(),
    toolCalls: z.array(z.object({ name: z.string(), phase: z.enum(['request', 'result', 'blocked']) })).optional(),
    stateChanges: z.array(z.object({ path: z.string(), from: z.unknown().optional(), to: z.unknown().optional() })).optional(),
    validationFailures: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
    confirmations: z.array(z.object({ action: z.string(), outcome: z.enum(['requested', 'granted', 'cancelled']) })).optional(),
    outcome: z.enum(['ok', 'blocked', 'failed', 'requires_confirmation']),
});

export const EvidenceBundleSchema = z.object({
    runId: z.string(),
    journeyId: z.string(),
    startedAt: z.string(),
    completedAt: z.string(),
    status: z.enum(['passed', 'failed']),
    steps: z.array(StepRecordSchema),
    snapshots: z.array(SnapshotSchema),
    console: z.array(ConsoleEntrySchema),
    network: z.array(NetworkEntrySchema),
    promptTraces: z.array(PromptTraceSchema),
    actionTraces: z.array(ActionTraceSchema),
    assertions: z.array(AssertionSchema),
});

export function validateEvidenceBundle(bundle: unknown): EvidenceBundle {
    return EvidenceBundleSchema.parse(bundle);
}

export function validatePromptTrace(trace: unknown): PromptTrace {
    return PromptTraceSchema.parse(trace);
}

export function validateActionTrace(trace: unknown): ActionTrace {
    return ActionTraceSchema.parse(trace);
}

// Re-export writeBundle from reporter
export { writeBundle, writeReplayBundle } from './reporter.js';

// Re-export replay functions
export { loadBundle, verifyReplay, updateFindingStatus } from './replay.js';
export type { ReplayResult } from './replay.js';

// Re-export a11y
export * from './a11y.js';