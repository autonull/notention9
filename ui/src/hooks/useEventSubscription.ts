import { useEffect, useRef } from 'react';

/**
 * Standardize event subscriptions to reduce boilerplate in hooks.
 * Uses a ref for handlers to prevent unnecessary re-subscriptions when
 * handlers are defined inline in the calling hook.
 */
export function useEventSubscription(
    emitter: { on: (event: string, cb: any) => void; off: (event: string, cb: any) => void } | null | undefined,
    events: Record<string, (...args: any[]) => void>
) {
    const handlersRef = useRef(events);
    handlersRef.current = events;

    useEffect(() => {
        if (!emitter) return;

        const subscriptions = Object.keys(events).map(event => {
            const wrapper = (...args: any[]) => handlersRef.current[event]?.(...args);
            emitter.on(event, wrapper);
            return { event, wrapper };
        });

        return () => {
            subscriptions.forEach(({ event, wrapper }) => {
                emitter.off(event, wrapper);
            });
        };
        // Dependency on keys ensures we re-subscribe if the set of events changes,
        // but not if only the handler functions change.
    }, [emitter, ...Object.keys(events)]);
}
