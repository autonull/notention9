import {useCallback, useEffect, useState} from 'react';

export function useOnlineStatus() {
    const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);

    useEffect(() => {
        const markOnline = () => setOnline(true);
        const markOffline = () => setOnline(false);
        window.addEventListener('online', markOnline);
        window.addEventListener('offline', markOffline);
        return () => {
            window.removeEventListener('online', markOnline);
            window.removeEventListener('offline', markOffline);
        };
    }, []);

    const retry = useCallback(async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setOnline(false);
            return;
        }
        try {
            await fetch(`${window.location.origin}/`, {cache: 'no-store'});
            setOnline(true);
        } catch {
            setOnline(false);
        }
    }, []);

    return {online, retry};
}
