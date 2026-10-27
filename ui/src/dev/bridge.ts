import type { SemanticState, PromptTrace, ActionTrace } from '@notention/optimize';

interface NotentionBridge {
    runId: string;
    state: () => SemanticState;
    promptTraces: () => PromptTrace[];
    actionTraces: () => ActionTrace[];
    flush: () => void;
}

declare global {
    interface Window {
        __NOTENTION__: NotentionBridge;
        __NOTENTION_READY__: boolean;
        __OPTIMIZE_RUN_ID__: string;
    }
}

let promptTraceBuffer: PromptTrace[] = [];
let actionTraceBuffer: ActionTrace[] = [];
let currentState: SemanticState | null = null;
let stateSubscribers: Array<(state: SemanticState) => void> = [];

export function installBridge(runId: string): NotentionBridge {
    const bridge: NotentionBridge = {
        runId,
        state: () => currentState ?? getDefaultState(),
        promptTraces: () => [...promptTraceBuffer],
        actionTraces: () => [...actionTraceBuffer],
        flush: () => {
            promptTraceBuffer = [];
            actionTraceBuffer = [];
        },
    };

    window.__NOTENTION__ = bridge;
    window.__NOTENTION_READY__ = true;

    return bridge;
}

export function updateState(state: SemanticState): void {
    currentState = state;
    stateSubscribers.forEach(cb => cb(state));
}

export function subscribeState(cb: (state: SemanticState) => void): () => void {
    stateSubscribers.push(cb);
    return () => {
        const idx = stateSubscribers.indexOf(cb);
        if (idx >= 0) stateSubscribers.splice(idx, 1);
    };
}

export function addPromptTrace(trace: PromptTrace): void {
    trace.runId = window.__OPTIMIZE_RUN_ID__;
    promptTraceBuffer.push(trace);
}

export function addActionTrace(trace: ActionTrace): void {
    trace.runId = window.__OPTIMIZE_RUN_ID__;
    actionTraceBuffer.push(trace);
}

function getDefaultState(): SemanticState {
    return {
        route: { view: 'notes', hash: '', noteId: null },
        note: null,
        editor: { dirty: false, propertyDraft: null },
        review: [],
        validation: { errors: [], missing: [] },
        dialogs: [],
        pendingConfirmations: [],
    };
}

if (import.meta.env.DEV) {
    (window as any).__NOTENTION_DEV__ = {
        updateState,
        addPromptTrace,
        addActionTrace,
        subscribeState,
    };
}