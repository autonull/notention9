import { useEffect, useCallback } from 'react';

// Simple event bus setup to share connection
type MessageHandler = (message: any) => void;

let ws: WebSocket | null = null;
const listeners = new Set<MessageHandler>();
const pendingMessages: string[] = [];
let connectTimeout: any = null;

function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    // Determine URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use configured port or default to 3000 (Agent Server)
    // Note: If served via proxy, might be different. 
    const url = `${protocol}//${window.location.hostname}:3000/ws/agent`;

    console.log('Connecting to Agent WS:', url);
    ws = new WebSocket(url);

    ws.onopen = () => {
        console.log('WS Connected');
        // Flush pending
        while (pendingMessages.length > 0) {
            const msg = pendingMessages.shift();
            if (msg) ws.send(msg);
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            listeners.forEach(l => l(data));
        } catch (e) {
            console.error('WS parse error', e);
        }
    };

    ws.onclose = () => {
        console.log('WS Closed');
        ws = null;
        // Reconnect logic
        if (connectTimeout) clearTimeout(connectTimeout);
        connectTimeout = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
        console.error('WS Error', err);
    };
}

export function useWebSocket() {
    useEffect(() => {
        connect();
        return () => {
            // We don't close the global connection on unmount of one component
        };
    }, []);

    const sendMessage = useCallback((msg: any) => {
        const str = JSON.stringify(msg);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(str);
        } else {
            pendingMessages.push(str);
            connect(); // Ensure connected
        }
    }, []);

    const subscribe = useCallback((handler: MessageHandler) => {
        listeners.add(handler);
        return () => listeners.delete(handler);
    }, []);

    return { sendMessage, subscribe };
}
