/**
 * Observability Module
 * 
 * OpenTelemetry-compatible structured events for core systems.
 * Provides zero-dependency fallback when @opentelemetry/api is not installed.
 * 
 * @example
 * ```typescript
 * import { getTracer, getMeter, observe } from '@notention/core/observability';
 * 
 * const tracer = getTracer('my-component');
 * const meter = getMeter('my-component');
 * 
 * // Structured event
 * observe('registry.register', { 'registry.name': 'strategies', 'registry.item.name': 'myStrategy' });
 * 
 * // Span-based tracing
 * const span = tracer.startSpan('operation');
 * span.setAttribute('key', 'value');
 * span.end();
 * 
 * // Metrics
 * const counter = meter.createCounter('operations');
 * counter.add(1, { 'operation': 'register' });
 * ```
 */

import type {
    ObservabilityEventAttributes,
    ObservableSpan,
    ObservableTracer,
    ObservableMeter,
    ObservabilityConfig,
    RegistryEventAttributes,
    StrategySystemEventAttributes,
    UrlRouterEventAttributes,
    BaseCommandEventAttributes,
    BaseStepExecutorEventAttributes,
} from './types.js';

import {
    EventSeverity,
    noopSpan,
    noopTracer,
    noopMeter,
    noopCounter,
    noopHistogram,
    noopGauge,
    generateTraceId,
    generateSpanId,
    nowIso,
} from './types.js';

// Re-export types
export type {
    EventSeverity,
    ObservabilityEventAttributes,
    ObservableSpan,
    ObservableTracer,
    ObservableMeter,
    ObservabilityConfig,
    RegistryEventAttributes,
    StrategySystemEventAttributes,
    UrlRouterEventAttributes,
    BaseCommandEventAttributes,
    BaseStepExecutorEventAttributes,
} from './types.js';

export {
    EventSeverity,
    noopSpan,
    noopTracer,
    noopMeter,
    noopCounter,
    noopHistogram,
    noopGauge,
    generateTraceId,
    generateSpanId,
    nowIso,
};

// ============================================================================
// Internal State
// ============================================================================

let tracerInstance: ObservableTracer | null = null;
let meterInstance: ObservableMeter | null = null;
let config: ObservabilityConfig = { serviceName: 'notention' };
let eventListeners: Array<(attrs: ObservabilityEventAttributes) => void> = [];
let initialized = false;

// ============================================================================
// Initialization
// ============================================================================

/** Initialize observability with optional OpenTelemetry integration */
export function initializeObservability(userConfig: Partial<ObservabilityConfig> = {}): void {
    if (initialized) return;
    
    config = { ...config, ...userConfig };
    
    // Try to load OpenTelemetry if available (synchronous check)
    try {
        // Use require-style import for sync check - will throw if not available
        const otelApi = require('@opentelemetry/api');
        
        tracerInstance = otelApi.trace.getTracer(config.serviceName, config.serviceVersion);
        meterInstance = otelApi.metrics.getMeter(config.serviceName, config.serviceVersion);
        
        // Set up global error handler for span recording
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                const span = tracerInstance?.startSpan('unhandled-error');
                span?.recordException(event.error ?? new Error(event.message));
                span?.setStatus({ code: otelApi.SpanStatusCode.ERROR, message: event.message });
                span?.end();
            });
        }
    } catch {
        // OpenTelemetry not available - use noop implementations
        tracerInstance = noopTracer;
        meterInstance = noopMeter;
    }
    
    initialized = true;
}

/** Get current configuration */
export function getObservabilityConfig(): ObservabilityConfig {
    return { ...config };
}

// ============================================================================
// Tracer & Meter Access
// ============================================================================

/** Get tracer instance (initializes if needed) */
export function getTracer(name?: string): ObservableTracer {
    if (!initialized) initializeObservability();
    return tracerInstance ?? noopTracer;
}

/** Get meter instance (initializes if needed) */
export function getMeter(name?: string): ObservableMeter {
    if (!initialized) initializeObservability();
    return meterInstance ?? noopMeter;
}

// ============================================================================
// Structured Event Emission
// ============================================================================

/** Emit a structured observability event */
export function observe(attributes: ObservabilityEventAttributes): void {
    if (!initialized) initializeObservability();
    
    // Add base attributes if missing
    const enriched: ObservabilityEventAttributes = {
        ...attributes,
        'service.name': attributes['service.name'] ?? config.serviceName,
        'event.time': attributes['event.time'] ?? nowIso(),
        'event.severity': attributes['event.severity'] ?? EventSeverity.INFO,
    };
    
    // Emit to listeners
    for (const listener of eventListeners) {
        try {
            listener(enriched);
        } catch {
            // Ignore listener errors
        }
    }
    
    // Also record as span event if tracer available
    if (tracerInstance && tracerInstance !== noopTracer) {
        const span = tracerInstance.startSpan(enriched['event.name']);
        for (const [key, value] of Object.entries(enriched)) {
            if (value !== undefined) {
                span.setAttribute(key, value);
            }
        }
        span.end();
    }
}

/** Subscribe to observability events */
export function onObserve(listener: (attrs: ObservabilityEventAttributes) => void): () => void {
    eventListeners.push(listener);
    return () => {
        const idx = eventListeners.indexOf(listener);
        if (idx >= 0) eventListeners.splice(idx, 1);
    };
}

/** Create a child span from current context */
export function startSpan(name: string, attributes?: Record<string, string | number | boolean>): ObservableSpan {
    const tracer = getTracer();
    return tracer.startSpan(name, { attributes });
}

/** Run function within a span */
export function withSpan<T>(name: string, fn: (span: ObservableSpan) => T, attributes?: Record<string, string | number | boolean>): T {
    const tracer = getTracer();
    return tracer.startActiveSpan(name, fn, { attributes });
}

// ============================================================================
// Convenience Functions for Core Systems
// ============================================================================

/** Observe registry operation */
export function observeRegistry(attrs: Omit<RegistryEventAttributes, 'service.name' | 'event.time' | 'event.severity'>): void {
    observe({
        ...attrs,
        'service.name': config.serviceName,
        'event.time': nowIso(),
        'event.severity': attrs['registry.error'] ? EventSeverity.ERROR : EventSeverity.INFO,
    } as RegistryEventAttributes);
}

/** Observe StrategySystem operation */
export function observeStrategySystem(attrs: Omit<StrategySystemEventAttributes, 'service.name' | 'event.time' | 'event.severity'>): void {
    observe({
        ...attrs,
        'service.name': config.serviceName,
        'event.time': nowIso(),
        'event.severity': attrs['strategysystem.error'] ? EventSeverity.ERROR : EventSeverity.INFO,
    } as StrategySystemEventAttributes);
}

/** Observe UrlRouter operation */
export function observeUrlRouter(attrs: Omit<UrlRouterEventAttributes, 'service.name' | 'event.time' | 'event.severity'>): void {
    observe({
        ...attrs,
        'service.name': config.serviceName,
        'event.time': nowIso(),
        'event.severity': attrs['urlrouter.error'] ? EventSeverity.ERROR : EventSeverity.INFO,
    } as UrlRouterEventAttributes);
}

/** Observe BaseCommand operation */
export function observeBaseCommand(attrs: Omit<BaseCommandEventAttributes, 'service.name' | 'event.time' | 'event.severity'>): void {
    observe({
        ...attrs,
        'service.name': config.serviceName,
        'event.time': nowIso(),
        'event.severity': attrs['command.error'] ? EventSeverity.ERROR : EventSeverity.INFO,
    } as BaseCommandEventAttributes);
}

/** Observe BaseStepExecutor operation */
export function observeBaseStepExecutor(attrs: Omit<BaseStepExecutorEventAttributes, 'service.name' | 'event.time' | 'event.severity'>): void {
    observe({
        ...attrs,
        'service.name': config.serviceName,
        'event.time': nowIso(),
        'event.severity': attrs['stepexecutor.error'] ? EventSeverity.ERROR : EventSeverity.INFO,
    } as BaseStepExecutorEventAttributes);
}

// ============================================================================
// Metrics Helpers
// ============================================================================

/** Create standard metrics for a component */
export function createComponentMetrics(componentName: string) {
    const meter = getMeter(componentName);
    return {
        counter: meter.createCounter(`${componentName}.operations`, { description: `Total ${componentName} operations` }),
        histogram: meter.createHistogram(`${componentName}.duration`, { description: `${componentName} operation duration`, unit: 'ms' }),
        errorCounter: meter.createCounter(`${componentName}.errors`, { description: `${componentName} errors` }),
    };
}

/** Record operation timing */
export function recordOperationDuration(
    histogram: ReturnType<ObservableMeter['createHistogram']>,
    operation: string,
    durationMs: number,
    attributes?: Record<string, string | number | boolean>
): void {
    histogram.record(durationMs, { operation, ...attributes });
}

/** Record operation success/error */
export function recordOperationResult(
    counter: ReturnType<ObservableMeter['createCounter']>,
    errorCounter: ReturnType<ObservableMeter['createCounter']>,
    operation: string,
    success: boolean,
    attributes?: Record<string, string | number | boolean>
): void {
    if (success) {
        counter.add(1, { operation, ...attributes });
    } else {
        errorCounter.add(1, { operation, ...attributes });
    }
}