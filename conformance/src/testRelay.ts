import { NostrRelay } from '@notention/core';

const relayInstances = new Map<number, NostrRelay>();

/**
 * Start a test Nostr relay on the given port
 */
export async function startRelay(port: number): Promise<string> {
    if (relayInstances.has(port)) {
        return `ws://localhost:${port}`;
    }

    const relay = new NostrRelay({ port });
    relayInstances.set(port, relay);

    // Wait for relay to be ready
    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Relay start timeout')), 5000);
        // Use a small delay to let the server start
        setTimeout(() => {
            clearTimeout(timeout);
            resolve();
        }, 100);
    });

    return `ws://localhost:${port}`;
}

/**
 * Stop a specific test relay
 */
export async function stopRelay(port: number): Promise<void> {
    const relay = relayInstances.get(port);
    if (relay) {
        await relay.close();
        relayInstances.delete(port);
    }
}

/**
 * Stop all test relays
 */
export async function stopAllRelays(): Promise<void> {
    for (const [port, relay] of relayInstances) {
        await relay.close();
    }
    relayInstances.clear();
}

/**
 * Get the current relay URL
 */
export function getRelayUrl(port: number): string | null {
    if (relayInstances.has(port)) {
        return `ws://localhost:${port}`;
    }
    return null;
}

/**
 * Create a fresh relay for a single test run (auto-cleans up)
 */
export async function withFreshRelay<T>(port: number, fn: (url: string) => Promise<T>): Promise<T> {
    // Use a unique port for this run
    const runPort = port + Math.floor(Math.random() * 10000);
    const url = await startRelay(runPort);
    try {
        return await fn(url);
    } finally {
        await stopRelay(runPort);
    }
}