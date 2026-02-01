import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { AgentStatus as AgentStatusType } from '../../../../agent/src/core/types';

export function AgentStatus() {
    const [status, setStatus] = useState<AgentStatusType | null>(null);
    const { sendMessage, subscribe } = useWebSocket();

    useEffect(() => {
        const unsubscribe = subscribe((message: any) => {
            if (message.type === 'agent_status') {
                setStatus(message.payload);
            }
        });

        const fetchStatus = () => {
            sendMessage({ type: 'get_agent_status' });
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 10000); // Poll every 10s

        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [sendMessage, subscribe]);

    if (!status) return <div>Connecting to agent...</div>;

    return (
        <div className="agent-status" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <div className={`status-indicator ${status.state}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{status.state === 'running' ? '🟢' : '🔴'}</span>
                <span style={{ fontWeight: 'bold' }}>{status.state.toUpperCase()}</span>
                <span style={{ fontSize: '0.8em', color: '#666' }}>v{status.version}</span>
            </div>

            <div className="capabilities" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {Object.entries(status.capabilities).map(([feature, enabled]) => (
                    <span key={feature} className={`capability ${enabled ? 'enabled' : 'disabled'}`}
                        style={{
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '0.75em',
                            backgroundColor: enabled ? '#e6fffa' : '#f5f5f5',
                            color: enabled ? '#008080' : '#888'
                        }}>
                        {feature}
                    </span>
                ))}
            </div>

            <div className="health" style={{ marginTop: '8px', fontSize: '0.8em' }}>
                <div style={{ marginRight: '10px', display: 'inline-block' }}>Workflows: {status.health.activeWorkflows}</div>
                <div style={{ display: 'inline-block' }}>Tools: {status.health.activeTools}</div>
            </div>
        </div>
    );
}
