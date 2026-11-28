/**
 * Observability Mixin
 * 
 * Provides a standardized way to add structured observability to any class.
 * Eliminates duplicated withObservabilitySync boilerplate across Registry,
 * FactoryRegistry, StrategySystem, ProfileRegistry, UrlRouter, and BaseCommand.
 */

import { withObservabilitySync, EventSeverity, observe, type ObservabilityEventAttributes } from '../observability/index.js';

/** Configuration for observability wrapper */
export interface ObservabilityConfig<Attrs extends ObservabilityEventAttributes> {
    /** The observe function to call (e.g., observeRegistry, observeStrategySystem) */
    observeFn: (attrs: Attrs) => void;
    /** Static attributes included in every observation */
    staticAttrs?: Partial<Attrs>;
    /** Attribute key for error messages */
    errorKey: keyof Attrs;
    /** Attribute key for duration in milliseconds */
    durationKey: keyof Attrs;
    /** Function to determine severity from error */
    getSeverity?: (error?: string) => EventSeverity;
    /** Operation attribute key name */
    operationKey: keyof Attrs;
}

/** Result of creating an observability wrapper */
export interface ObservabilityWrapper<Attrs extends ObservabilityEventAttributes> {
    /** Wrap a sync function with observability */
    wrap<T>(
        operation: string, 
        dynamicAttrs: Partial<Attrs>, 
        fn: () => T,
        resultAttrs?: (result: T) => Partial<Attrs>
    ): T;
    /** Wrap an async function with observability */
    wrapAsync<T>(
        operation: string, 
        dynamicAttrs: Partial<Attrs>, 
        fn: () => Promise<T>,
        resultAttrs?: (result: T) => Partial<Attrs>
    ): Promise<T>;
}

/**
 * Creates an observability wrapper for a class.
 * 
 * @example
 * ```typescript
 * class MyRegistry {
 *     private observe = createObservabilityWrapper({
 *         observeFn: observeRegistry,
 *         staticAttrs: { 'registry.name': 'MyRegistry' },
 *         errorKey: 'registry.error',
 *         durationKey: 'registry.duration.ms',
 *         operationKey: 'registry.operation',
 *     });
 *     
 *     register(item: Item): void {
 *         this.observe.wrap('register', { 'registry.item.name': item.name }, () => {
 *             this.items.set(item.name, item);
 *         });
 *     }
 * }
 * ```
 */
export function createObservabilityWrapper<Attrs extends ObservabilityEventAttributes>(
    config: ObservabilityConfig<Attrs>
): ObservabilityWrapper<Attrs> {
    const { observeFn, staticAttrs = {}, errorKey, durationKey, getSeverity, operationKey } = config;
    
    const observeOp = withObservabilitySync<Attrs>({
        observeFn,
        operation: '',
        staticAttrs,
        errorKey,
        getSeverity: getSeverity ?? ((err) => err ? EventSeverity.ERROR : EventSeverity.INFO),
        durationKey: durationKey as string,
    });

    return {
        wrap<T>(operation: string, dynamicAttrs: Partial<Attrs>, fn: () => T, resultAttrs?: (result: T) => Partial<Attrs>): T {
            let result: T;
            let resultAttrsObj: Partial<Attrs> = {};
            
            // Use the sync observeOp which handles timing
            result = observeOp({ ...dynamicAttrs, [operationKey as string]: operation }, () => {
                result = fn();
                if (resultAttrs) {
                    resultAttrsObj = resultAttrs(result);
                }
                return result;
            });
            
            // If resultAttrs was provided, emit additional attributes
            if (resultAttrs) {
                observeFn({
                    ...staticAttrs,
                    ...dynamicAttrs,
                    [operationKey as string]: operation,
                    [errorKey]: undefined,
                    'event.severity': getSeverity ? getSeverity(undefined) : EventSeverity.INFO,
                    ...resultAttrsObj,
                } as unknown as Attrs);
            }
            
            return result;
        },
        async wrapAsync<T>(operation: string, dynamicAttrs: Partial<Attrs>, fn: () => Promise<T>, resultAttrs?: (result: T) => Partial<Attrs>): Promise<T> {
            const startTime = performance.now();
            try {
                const result = await fn();
                const durationMs = performance.now() - startTime;
                let resultAttrsObj: Partial<Attrs> = {};
                if (resultAttrs) {
                    resultAttrsObj = resultAttrs(result);
                }
                observeFn({
                    ...staticAttrs,
                    ...dynamicAttrs,
                    ...resultAttrsObj,
                    [operationKey as string]: operation,
                    [errorKey]: undefined,
                    'event.severity': EventSeverity.INFO,
                    [durationKey]: durationMs,
                } as unknown as Attrs);
                return result;
            } catch (error) {
                const durationMs = performance.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                observeFn({
                    ...staticAttrs,
                    ...dynamicAttrs,
                    [operationKey as string]: operation,
                    [errorKey]: errorMessage,
                    'event.severity': EventSeverity.ERROR,
                    [durationKey]: durationMs,
                } as unknown as Attrs);
                throw error;
            }
        },
    };
}