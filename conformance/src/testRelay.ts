import { NostrRelay } from '@notention/core';

const relayInstances = new Map<number, NostrRelay>();

/**
 * Start a test Nostr relay. Pass `0` (default) for an OS-assigned ephemeral
 * port, so parallel test files never collide. Returns the bound URL.
 */
export async function startRelay(port = 0): Promise<string> {
    const existing = relayInstances.get(port);
    if (existing) {
        return existing.url;
    }

    const relay = new NostrRelay({ port });
    relayInstances.set(port, relay);

    return relay.start();
}

/**
 * Stop a specific test relay
 */
export async function stopRelay(port = 0): Promise<void> {
    const relay = relayInstances.get(port);
    if (relay) {
        await relay.close();
        relayInstances.delete(port);
    }
}

/**
 * Clear all events from a test relay (for test isolation between runs)
 */
export function clearRelayEvents(port = 0): void {
    const relay = relayInstances.get(port);
    if (relay) {
        relay.clearEvents();
    }
}

/**
 * Fully reset a test relay by closing all connections and clearing events.
 * Returns the (possibly new) URL, since an ephemeral port can change.
 */
export async function resetRelay(port = 0): Promise<string> {
    await stopRelay(port);
    return startRelay(port);
}

/**
 * Stop all test relays
 */
export async function stopAllRelays(): Promise<void> {
    for (const relay of relayInstances.values()) {
        await relay.close();
    }
    relayInstances.clear();
}

/**
 * Get the current relay URL
 */
export function getRelayUrl(port = 0): string | null {
    return relayInstances.get(port)?.url ?? null;
}

/**
 * Create a fresh relay for a single test run (auto-cleans up)
 */
export async function withFreshRelay<T>(port = 0, fn: (url: string) => Promise<T>): Promise<T> {
    const url = await startRelay(port);
    try {
        return await fn(url);
    } finally {
        await stopRelay(port);
    }
}
