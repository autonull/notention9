import { SimplePool, Filter } from 'nostr-tools';
import type { NostrEvent } from '../types/index.js';

/**
 * Helper to query events using subscribeMany/subscribeMap.
 * Aggregates events until EOSE or timeout.
 *
 * @param pool The SimplePool instance.
 * @param relays List of relay URLs.
 * @param filters List of Nostr filters.
 * @param timeoutMs Timeout in milliseconds (default 5000).
 */
export const queryEventsWithTimeout = (
  pool: SimplePool,
  relays: string[],
  filters: Filter[],
  timeoutMs: number = 5000
): Promise<NostrEvent[]> => {
  return new Promise((resolve) => {
    const events: NostrEvent[] = [];

    // Use subscribeMap to support multiple filters per relay
    const requests = relays.flatMap(url =>
      filters.map(filter => ({ url, filter }))
    );

    const sub = pool.subscribeMap(requests, {
      onevent(event) {
        events.push(event as NostrEvent);
      },
      oneose() {
        sub.close();
        resolve(events);
      }
    });

    // Fallback timeout in case relays don't send EOSE
    setTimeout(() => {
        sub.close();
        resolve(events);
    }, timeoutMs);
  });
};
