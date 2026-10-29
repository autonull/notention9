import {useCallback, useRef} from 'react';

interface MetricEvent {
    name: string;
    properties: Record<string, string | number | boolean>;
    timestamp: number;
}

type MetricCallback = (event: MetricEvent) => void;

const listeners = new Set<MetricCallback>();
const eventQueue: MetricEvent[] = [];
const MAX_QUEUE_SIZE = 100;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush(): void {
    if (eventQueue.length === 0) return;

    const events = [...eventQueue];
    eventQueue.length = 0;

    for (const listener of listeners) {
        try {
            listener({name: 'batch', properties: {events: JSON.stringify(events)}, timestamp: Date.now()});
        } catch {
            // Silently fail to avoid breaking the app
        }
    }
}

function scheduleFlush(): void {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        flush();
    }, 5000);
}

export function useMetrics() {
    const sessionIdRef = useRef(() => {
        try {
            return window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
        } catch {
            return Math.random().toString(36).slice(2);
        }
    })();

    const track = useCallback((name: string, properties: Record<string, string | number | boolean> = {}) => {
        const event: MetricEvent = {
            name,
            properties: {
                ...properties,
                sessionId: sessionIdRef.current,
                url: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
            },
            timestamp: Date.now(),
        };

        eventQueue.push(event);
        if (eventQueue.length >= MAX_QUEUE_SIZE) {
            flush();
        } else {
            scheduleFlush();
        }
    }, []);

    return {track};
}

export function subscribeMetrics(callback: MetricCallback): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

export function getMetricsQueue(): MetricEvent[] {
    return [...eventQueue];
}

export function clearMetricsQueue(): void {
    eventQueue.length = 0;
}

// Convenience metric names
export const Metrics = {
    // Golden Path
    TIME_TO_FIRST_MATCH: 'time_to_first_match',
    MATCH_ACCEPTED: 'match_accepted',
    MATCH_REJECTED: 'match_rejected',
    MATCH_VIEWED: 'match_viewed',

    // Data durability
    EXPORT_WORKSPACE: 'export_workspace',
    EXPORT_NOTE: 'export_note',
    IMPORT_WORKSPACE: 'import_workspace',
    IMPORT_SUCCESS: 'import_success',
    IMPORT_FAILED: 'import_failed',

    // Capabilities
    CAPABILITY_GRANT_VIEWED: 'capability_grant_viewed',
    CAPABILITY_REVOKED: 'capability_revoked',

    // Pattern recognition
    PATTERN_SUGGESTION_SHOWN: 'pattern_suggestion_shown',
    PATTERN_SUGGESTION_ACCEPTED: 'pattern_suggestion_accepted',
    PATTERN_SUGGESTION_DISMISSED: 'pattern_suggestion_dismissed',

    // Templates
    TEMPLATE_SELECTED: 'template_selected',
    TEMPLATE_NOTE_CREATED: 'template_note_created',
    TEMPLATE_MATCH_SUCCESS: 'template_match_success',

    // Automation
    AUTOMATION_CREATED: 'automation_created',
    AUTOMATION_TRIGGERED: 'automation_triggered',

    // CLI/Simulator
    CLI_SESSION_STARTED: 'cli_session_started',
    SIMULATOR_SCENARIO_RUN: 'simulator_scenario_run',
    OPTIMIZE_REPRODUCE: 'optimize_reproduce',
} as const;