import React, {useEffect, useState} from 'react';

interface AgentCursorProps {
    // In a real implementation this would accept a WebSocket connection or event emitter
}

export function AgentCursor() {
    const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
    const [action, setAction] = useState<string | null>(null);

    useEffect(() => {
        // Mocking the WebSocket subscription for now
        // In reality: socket.on('agent_activity', (data) => ...)

        const handleAgentEvent = (e: CustomEvent) => {
            if (e.detail?.type === 'cursor_move') {
                setPosition(e.detail.position);
            }
            if (e.detail?.type === 'action_start') {
                setAction(e.detail.action);
                // Reset action after a delay
                setTimeout(() => setAction(null), 2000);
            }
        };

        window.addEventListener('agent-event' as any, handleAgentEvent as any);
        return () => window.removeEventListener('agent-event' as any, handleAgentEvent as any);
    }, []);

    if (!position) return null;

    return (
        <div
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                pointerEvents: 'none',
                zIndex: 9999,
                transition: 'all 0.3s ease'
            }}
        >
            <div style={{
                width: '20px',
                height: '20px',
                background: 'red',
                borderRadius: '50%',
                opacity: 0.7,
                boxShadow: '0 0 10px rgba(255,0,0,0.5)'
            }}/>
            {action && (
                <div style={{
                    position: 'absolute',
                    top: '25px',
                    left: '10px',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                }}>
                    Agent: {action}
                </div>
            )}
        </div>
    );
}
