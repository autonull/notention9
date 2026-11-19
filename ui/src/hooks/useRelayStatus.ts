import {useCallback, useEffect, useMemo, useState} from 'react';
import {resolveRelays} from '@notention/core';

const PROBE_TIMEOUT = 2500;

interface RelayStatus {
    url: string;
    reachable: boolean;
    latency?: number;
    lastChecked: number;
    error?: string;
    /** Health score 0-1 */
    healthScore?: number;
    /** Health latency (ms) */
    healthLatency?: number;
    /** Health success rate (%) */
    healthSuccessRate?: number;
}

const probe = (url: string): Promise<RelayStatus> => new Promise(resolve => {
    let settled = false;
    let socket: WebSocket | null = null;
    const start = Date.now();

    const finish = (status: RelayStatus) => {
        if (settled) return;
        settled = true;
        socket?.close();
        resolve(status);
    };

    const timer = setTimeout(() => finish({url, reachable: false, lastChecked: Date.now(), error: 'timeout'}), PROBE_TIMEOUT);

    try {
        socket = new WebSocket(url);
        socket.onopen = () => {
            clearTimeout(timer);
            const latency = Date.now() - start;
            finish({url, reachable: true, latency, lastChecked: Date.now()});
        };
        socket.onerror = (e) => {
            clearTimeout(timer);
            finish({url, reachable: false, lastChecked: Date.now(), error: 'connection error'});
        };
        socket.onclose = (e) => {
            if (!settled) {
                clearTimeout(timer);
                finish({url, reachable: false, lastChecked: Date.now(), error: e.reason || 'closed'});
            }
        };
    } catch (e) {
        clearTimeout(timer);
        finish({url, reachable: false, lastChecked: Date.now(), error: String(e)});
    }
});

export function useRelayStatus(relays?: string[]) {
    const relayList = useMemo(() => resolveRelays(relays), [relays]);
    const [statuses, setStatuses] = useState<RelayStatus[]>([]);
    const [checking, setChecking] = useState(false);

    const check = useCallback(async () => {
        setChecking(true);
        try {
            const results = await Promise.all(relayList.map(url => probe(url)));
            // Merge with health data from core
            if (typeof window !== 'undefined') {
                const { nostrRelayHealth } = await import('@notention/core');
                const enriched = results.map(r => {
                    const health = nostrRelayHealth.relayHealthManager.getStatus(r.url);
                    return {
                        ...r,
                        healthScore: health.score,
                        healthLatency: health.latency,
                        healthSuccessRate: health.successRate,
                    };
                });
                setStatuses(enriched);
            } else {
                setStatuses(results);
            }
        } finally {
            setChecking(false);
        }
    }, [relayList]);

    useEffect(() => {
        check();
    }, [check]);

    const down = useMemo(() => statuses.filter(s => !s.reachable).map(s => s.url), [statuses]);
    const up = useMemo(() => statuses.filter(s => s.reachable), [statuses]);

    return {statuses, down, up, checking, retry: check};
}

export type {RelayStatus};
