import {useCallback, useEffect, useMemo, useState} from 'react';
import {resolveRelays} from '@notention/core';

const PROBE_TIMEOUT = 2500;

const probe = (url: string): Promise<boolean> => new Promise(resolve => {
    let settled = false;
    let socket: WebSocket | null = null;

    const finish = (reachable: boolean) => {
        if (settled) return;
        settled = true;
        socket?.close();
        resolve(reachable);
    };

    const timer = setTimeout(() => finish(false), PROBE_TIMEOUT);

    try {
        socket = new WebSocket(url);
        socket.onopen = () => {
            clearTimeout(timer);
            finish(true);
        };
        socket.onerror = () => {
            clearTimeout(timer);
            finish(false);
        };
    } catch {
        clearTimeout(timer);
        finish(false);
    }
});

export function useRelayStatus(relays?: string[]) {
    const relayList = useMemo(() => resolveRelays(relays), [relays]);
    const [down, setDown] = useState<string[]>([]);
    const [checking, setChecking] = useState(false);

    const check = useCallback(async () => {
        setChecking(true);
        try {
            const results = await Promise.all(relayList.map(async url => ({url, reachable: await probe(url)})));
            setDown(results.filter(result => !result.reachable).map(result => result.url));
        } finally {
            setChecking(false);
        }
    }, [relayList]);

    useEffect(() => {
        check();
    }, [check]);

    return {down, checking, retry: check};
}
