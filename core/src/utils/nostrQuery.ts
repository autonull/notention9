import { SimplePool, Filter } from 'nostr-tools';
import type { NostrEvent } from '../types/index.js';

export const queryEventsWithTimeout = (
  pool: SimplePool,
  relays: string[],
  filters: Filter[],
  timeoutMs = 5000,
): Promise<NostrEvent[]> =>
  new Promise((resolve) => {
    const events: NostrEvent[] = [];

    const requests = relays.flatMap(url =>
      filters.map(filter => ({ url, filter })),
    );

    const sub = pool.subscribeMap(requests, {
      onevent(event) {
        events.push(event as NostrEvent);
      },
      oneose() {
        sub.close();
        resolve(events);
      },
    });

    setTimeout(() => {
      sub.close();
      resolve(events);
    }, timeoutMs);
  });
