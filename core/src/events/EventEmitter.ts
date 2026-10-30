/**
 * Event/Telemetry System for Notention
 * Structured event emission with pluggable sinks
 */

export type EventCategory =
    | 'extraction'
    | 'match'
    | 'strategy'
    | 'error'
    | 'performance'
    | 'lifecycle';

export interface BaseEvent<T extends EventCategory, P extends Record<string, unknown>> {
    category: T;
    type: string;
    timestamp: number;
    payload: P;
    sessionId?: string;
    correlationId?: string;
}

export interface ExtractionEventPayload {
    stage: string;
    inputLength: number;
    propertiesFound: number;
    durationMs: number;
    success: boolean;
    error?: string;
}

export interface MatchEventPayload {
    queryType: string;
    resultsCount: number;
    durationMs: number;
    threshold: number;
}

export interface StrategyEventPayload {
    strategyId: string;
    seamId: string;
    action: 'mount' | 'unmount' | 'save' | 'cancel' | 'error';
    durationMs?: number;
    error?: string;
}

export interface ErrorEventPayload {
    errorType: string;
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
    severity: 'warning' | 'error' | 'critical';
}

export interface PerformanceEventPayload {
    operation: string;
    durationMs: number;
    metadata?: Record<string, unknown>;
}

export interface LifecycleEventPayload {
    phase: 'init' | 'ready' | 'shutdown' | 'error';
    component: string;
    details?: Record<string, unknown>;
}

export type ExtractionEvent = BaseEvent<'extraction', ExtractionEventPayload>;
export type MatchEvent = BaseEvent<'match', MatchEventPayload>;
export type StrategyEvent = BaseEvent<'strategy', StrategyEventPayload>;
export type ErrorEvent = BaseEvent<'error', ErrorEventPayload>;
export type PerformanceEvent = BaseEvent<'performance', PerformanceEventPayload>;
export type LifecycleEvent = BaseEvent<'lifecycle', LifecycleEventPayload>;

export type AnyEvent =
    | ExtractionEvent
    | MatchEvent
    | StrategyEvent
    | ErrorEvent
    | PerformanceEvent
    | LifecycleEvent;

export interface EventSink {
    name: string;
    enabled: boolean;
    sampleRate: number;
    minSeverity?: 'warning' | 'error' | 'critical';
    emit(event: AnyEvent): void | Promise<void>;
    flush?(): void | Promise<void>;
    shutdown?(): void | Promise<void>;
}

export interface EventEmitterConfig {
    sinks: EventSink[];
    defaultSampleRate: number;
    sessionId: string;
}

export class EventEmitter {
    private sinks: EventSink[];
    private defaultSampleRate: number;
    private sessionId: string;
    private eventBuffer: AnyEvent[] = [];
    private bufferSize = 100;
    private flushInterval: ReturnType<typeof setInterval> | null = null;

    constructor(config: Partial<EventEmitterConfig> = {}) {
        this.sinks = config.sinks ?? [];
        this.defaultSampleRate = config.defaultSampleRate ?? 1.0;
        this.sessionId = config.sessionId ?? generateSessionId();
        
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.shutdown());
        }
    }

    addSink(sink: EventSink): void {
        this.sinks.push(sink);
    }

    removeSink(name: string): void {
        this.sinks = this.sinks.filter(s => s.name !== name);
    }

    private shouldSample(event: AnyEvent, sink: EventSink): boolean {
        if (!sink.enabled) return false;
        if (sink.minSeverity && event.category === 'error') {
            const payload = event.payload as ErrorEventPayload;
            const severityOrder = { warning: 0, error: 1, critical: 2 };
            if (severityOrder[payload.severity] < severityOrder[sink.minSeverity]) {
                return false;
            }
        }
        return Math.random() < (sink.sampleRate ?? this.defaultSampleRate);
    }

    emit<T extends AnyEvent>(event: T): void {
        const fullEvent = {
            ...event,
            sessionId: event.sessionId ?? this.sessionId,
            timestamp: event.timestamp ?? Date.now(),
        } as AnyEvent;

        for (const sink of this.sinks) {
            if (this.shouldSample(fullEvent, sink)) {
                try {
                    const result = sink.emit(fullEvent);
                    if (result instanceof Promise) {
                        result.catch(err => console.error(`Sink ${sink.name} error:`, err));
                    }
                } catch (err) {
                    console.error(`Sink ${sink.name} error:`, err);
                }
            }
        }

        this.eventBuffer.push(fullEvent);
        if (this.eventBuffer.length > this.bufferSize) {
            this.eventBuffer.shift();
        }
    }

    emitExtraction(event: Omit<ExtractionEvent, 'category' | 'timestamp' | 'sessionId'>): void {
        this.emit({
            ...event,
            category: 'extraction',
            timestamp: Date.now(),
            sessionId: this.sessionId,
        } as ExtractionEvent);
    }

    emitMatch(event: Omit<MatchEvent, 'category' | 'timestamp' | 'sessionId'>): void {
        this.emit({
            ...event,
            category: 'match',
            timestamp: Date.now(),
            sessionId: this.sessionId,
        } as MatchEvent);
    }

    emitStrategy(event: Omit<StrategyEvent, 'category' | 'timestamp' | 'sessionId'>): void {
        this.emit({
            ...event,
            category: 'strategy',
            timestamp: Date.now(),
            sessionId: this.sessionId,
        } as StrategyEvent);
    }

    emitError(event: Omit<ErrorEvent, 'category' | 'timestamp' | 'sessionId'>): void {
        this.emit({
            ...event,
            category: 'error',
            timestamp: Date.now(),
            sessionId: this.sessionId,
        } as ErrorEvent);
    }

    emitPerformance(event: Omit<PerformanceEvent, 'category' | 'timestamp' | 'sessionId'>): void {
        this.emit({
            ...event,
            category: 'performance',
            timestamp: Date.now(),
            sessionId: this.sessionId,
        } as PerformanceEvent);
    }

    emitLifecycle(event: Omit<LifecycleEvent, 'category' | 'timestamp' | 'sessionId'>): void {
        this.emit({
            ...event,
            category: 'lifecycle',
            timestamp: Date.now(),
            sessionId: this.sessionId,
        } as LifecycleEvent);
    }

    getRecentEvents(count = 50): AnyEvent[] {
        return this.eventBuffer.slice(-count);
    }

    getEventsByCategory(category: EventCategory): AnyEvent[] {
        return this.eventBuffer.filter(e => e.category === category);
    }

    setSampleRate(rate: number): void {
        this.defaultSampleRate = Math.max(0, Math.min(1, rate));
    }

    enableSink(name: string): void {
        const sink = this.sinks.find(s => s.name === name);
        if (sink) sink.enabled = true;
    }

    disableSink(name: string): void {
        const sink = this.sinks.find(s => s.name === name);
        if (sink) sink.enabled = false;
    }

    startAutoFlush(intervalMs = 30000): void {
        if (this.flushInterval) return;
        this.flushInterval = setInterval(() => {
            for (const sink of this.sinks) {
                if (sink.flush) {
                    try {
                        const result = sink.flush();
                        if (result instanceof Promise) result.catch(console.error);
                    } catch (err) {
                        console.error(`Sink flush error:`, err);
                    }
                }
            }
        }, intervalMs);
    }

    stopAutoFlush(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }

    async shutdown(): Promise<void> {
        this.stopAutoFlush();
        for (const sink of this.sinks) {
            if (sink.shutdown) {
                try {
                    await sink.shutdown();
                } catch (err) {
                    console.error(`Sink shutdown error:`, err);
                }
            }
        }
    }
}

function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export const eventEmitter = new EventEmitter({
    sessionId: generateSessionId(),
});