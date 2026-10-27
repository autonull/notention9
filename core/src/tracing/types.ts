export interface TraceSink {
    prompt(entry: PromptTrace): void;
    action(entry: ActionTrace): void;
}

let currentSink: TraceSink = {
    prompt: () => {},
    action: () => {},
};

export function setTraceSink(sink: TraceSink): void {
    currentSink = sink;
}

export function getTraceSink(): TraceSink {
    return currentSink;
}

export function emitPromptTrace(entry: PromptTrace): void {
    currentSink.prompt(entry);
}

export function emitActionTrace(entry: ActionTrace): void {
    currentSink.action(entry);
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