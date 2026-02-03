import { useEffect, useCallback } from 'react';
import { Logger } from '@notention/core';

// Simple event bus setup to share connection
type MessageHandler = (message: any) => void;

let ws: WebSocket | null = null;
const listeners = new Set<MessageHandler>();
const pendingMessages: string[] = [];
let connectTimeout: any = null;
const logger = Logger.getInstance();

function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    // Determine URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use configured port or default to 3000 (Agent Server)
    // Note: If served via proxy, might be different. 
    const url = `${protocol}//${window.location.hostname}:3000/ws/agent`;

    logger.info('Connecting to Agent WS:', url);
    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
        logger.info('WS Connected');
        // Flush pending
        while (pendingMessages.length > 0) {
            const msg = pendingMessages.shift();
            if (msg) socket.send(msg);
        }
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            listeners.forEach(l => l(data));
        } catch (e) {
            logger.error('WS parse error', e as Error);
        }
    };

    socket.onclose = () => {
        logger.info('WS Closed');
        if (ws === socket) {
            ws = null;
        }
        // Reconnect logic
        if (connectTimeout) clearTimeout(connectTimeout);
        connectTimeout = setTimeout(connect, 3000);
    };

    socket.onerror = (err) => {
        logger.error('WS Error', err as unknown as Error);
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
