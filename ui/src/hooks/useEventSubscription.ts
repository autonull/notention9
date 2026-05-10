import { useEffect } from 'react';

/**
 * Standardize event subscriptions to reduce boilerplate in hooks.
 */
export function useEventSubscription(
    emitter: { on: (event: string, cb: any) => void; off: (event: string, cb: any) => void },
    events: Record<string, (...args: any[]) => void>
) {
    useEffect(() => {
        Object.entries(events).forEach(([event, cb]) => {
            emitter.on(event, cb);
        });

        return () => {
            Object.entries(events).forEach(([event, cb]) => {
                emitter.off(event, cb);
            });
        };
    }, [emitter, ...Object.values(events)]);
}
