/**
 * Observability Types
 * 
 * OpenTelemetry-compatible structured event types for core systems.
 * Designed to work with or without @opentelemetry/api installed.
 */

import type { SpanStatusCode } from '@opentelemetry/api';

// ============================================================================
// Core Types
// ============================================================================

/** Event severity levels matching OpenTelemetry */
export enum EventSeverity {
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5,
}

/** Standard attributes for all observability events */
export interface BaseEventAttributes {
    /** Service/component name */
    'service.name': string;
    /** Event timestamp (ISO 8601) */
    'event.time': string;
    /** Event name/operation */
    'event.name': string;
    /** Event severity */
    'event.severity': EventSeverity;
    /** Trace ID for distributed tracing */
    'trace.id'?: string;
    /** Span ID for distributed tracing */
    'span.id'?: string;
}

/** Registry-specific event attributes */
export interface RegistryEventAttributes extends BaseEventAttributes {
    'registry.name': string;
    'registry.operation': 'register' | 'unregister' | 'get' | 'getAll' | 'listNames' | 'has' | 'size' | 'clear' | 'find' | 'filter' | 'resolveAll';
    'registry.item.name'?: string;
    'registry.item.type'?: string;
    'registry.error'?: string;
    'registry.duration.ms'?: number;
}

/** StrategySystem-specific event attributes */
export interface StrategySystemEventAttributes extends BaseEventAttributes {
    'strategysystem.operation': 'registerStrategy' | 'registerProfile' | 'registerPolicy' | 'resolveStrategy' | 'getProfile' | 'setActiveProfile' | 'setOverride' | 'registerExperiment';
    'strategysystem.seam'?: string;
    'strategysystem.strategy'?: string;
    'strategysystem.profile'?: string;
    'strategysystem.userId'?: string;
    'strategysystem.error'?: string;
    'strategysystem.duration.ms'?: number;
}

/** UrlRouter-specific event attributes */
export interface UrlRouterEventAttributes extends BaseEventAttributes {
    'urlrouter.operation': 'parse' | 'serialize' | 'init' | 'sync' | 'subscribe' | 'navigate';
    'urlrouter.route.view'?: string;
    'urlrouter.route.noteId'?: string;
    'urlrouter.route.mode'?: string;
    'urlrouter.route.section'?: string;
    'urlrouter.route.tab'?: string;
    'urlrouter.error'?: string;
    'urlrouter.duration.ms'?: number;
}

/** BaseCommand-specific event attributes */
export interface BaseCommandEventAttributes extends BaseEventAttributes {
    'command.name': string;
    'command.operation': 'parseArgs' | 'execute' | 'printResult' | 'getFlag';
    'command.args.count'?: number;
    'command.flags'?: string;
    'command.error'?: string;
    'command.duration.ms'?: number;
    'command.exitCode'?: number;
}

/** BaseStepExecutor-specific event attributes */
export interface BaseStepExecutorEventAttributes extends BaseEventAttributes {
    'stepexecutor.stepKind': string;
    'stepexecutor.operation': 'resolveTarget' | 'waitForReady' | 'waitFor' | 'getStateSnapshot' | 'getAriaSnapshot' | 'validateStepKind' | 'execute' | 'takeScreenshot';
    'stepexecutor.target.type'?: string;
    'stepexecutor.isModal'?: boolean;
    'stepexecutor.error'?: string;
    'stepexecutor.duration.ms'?: number;
}

/** Union of all event attribute types */
export type ObservabilityEventAttributes = 
    | RegistryEventAttributes 
    | StrategySystemEventAttributes 
    | UrlRouterEventAttributes 
    | BaseCommandEventAttributes 
    | BaseStepExecutorEventAttributes;

/** Event emitter interface (OpenTelemetry-compatible) */
export interface EventEmitter {
    emit(attributes: ObservabilityEventAttributes): void;
    on(attributes: ObservabilityEventAttributes, listener: (attrs: ObservabilityEventAttributes) => void): () => void;
}

/** Span interface (subset of OpenTelemetry Span) */
export interface ObservableSpan {
    /** Span name */
    name: string;
    /** Set attribute on span */
    setAttribute(key: string, value: string | number | boolean | undefined): this;
    /** Set multiple attributes */
    setAttributes(attributes: Record<string, string | number | boolean | undefined>): this;
    /** Record exception */
    recordException(exception: Error, attributes?: Record<string, string | number | boolean>): this;
    /** Set span status */
    setStatus(status: { code: SpanStatusCode; message?: string }): this;
    /** End span */
    end(endTime?: number): void;
    /** Get span context */
    spanContext(): { traceId: string; spanId: string; traceFlags: number };
    /** Add event to span */
    addEvent(name: string, attributes?: Record<string, string | number | boolean>): this;
}

/** Tracer interface (subset of OpenTelemetry Tracer) */
export interface ObservableTracer {
    /** Start a new span */
    startSpan(name: string, options?: { attributes?: Record<string, string | number | boolean> }): ObservableSpan;
    /** Start active span */
    startActiveSpan<T>(name: string, fn: (span: ObservableSpan) => T, options?: { attributes?: Record<string, string | number | boolean> }): T;
}

/** Meter interface (subset of OpenTelemetry Meter) */
export interface ObservableMeter {
    /** Create counter */
    createCounter(name: string, options?: { description?: string; unit?: string }): ObservableCounter;
    /** Create histogram */
    createHistogram(name: string, options?: { description?: string; unit?: string }): ObservableHistogram;
    /** Create gauge */
    createGauge(name: string, options?: { description?: string; unit?: string }): ObservableGauge;
}

/** Counter interface */
export interface ObservableCounter {
    add(value: number, attributes?: Record<string, string | number | boolean>): void;
}

/** Histogram interface */
export interface ObservableHistogram {
    record(value: number, attributes?: Record<string, string | number | boolean>): void;
}

/** Gauge interface */
export interface ObservableGauge {
    set(value: number, attributes?: Record<string, string | number | boolean>): void;
}

/** Observability SDK configuration */
export interface ObservabilityConfig {
    /** Service name */
    serviceName: string;
    /** Service version */
    serviceVersion?: string;
    /** Enable debug logging */
    debug?: boolean;
    /** Sampling ratio (0-1) */
    sampleRate?: number;
    /** Export endpoint (optional) */
    exportEndpoint?: string;
    /** Custom resource attributes */
    resourceAttributes?: Record<string, string | number | boolean>;
}

/** No-op implementations for when OpenTelemetry is not available */
export const noopSpan: ObservableSpan = {
    name: 'noop',
    setAttribute() { return this; },
    setAttributes() { return this; },
    recordException() { return this; },
    setStatus() { return this; },
    end() {},
    spanContext() { return { traceId: '', spanId: '', traceFlags: 0 }; },
    addEvent() { return this; },
};

export const noopTracer: ObservableTracer = {
    startSpan() { return noopSpan; },
    startActiveSpan<T>(_name: string, fn: (span: ObservableSpan) => T) { return fn(noopSpan); },
};

export const noopMeter: ObservableMeter = {
    createCounter() { return noopCounter; },
    createHistogram() { return noopHistogram; },
    createGauge() { return noopGauge; },
};

export const noopCounter: ObservableCounter = { add() {} };
export const noopHistogram: ObservableHistogram = { record() {} };
export const noopGauge: ObservableGauge = { set() {} };

/** Generate a random trace ID */
export function generateTraceId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/** Generate a random span ID */
export function generateSpanId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/** Get current time in ISO 8601 format */
export function nowIso(): string {
    return new Date().toISOString();
}