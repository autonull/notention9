import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { AgentStatus as AgentStatusType } from '../../../agent/src/core/types';

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

    if (!status) return (
        <div className="p-3 text-sm text-gray-500 animate-pulse">
            Connecting to agent...
        </div>
    );

    return (
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 text-sm shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
                <span className={`flex h-2 w-2 rounded-full ${status.state === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="font-bold text-gray-200 uppercase tracking-wide text-xs">{status.state}</span>
                <span className="text-[10px] text-gray-500 font-mono border border-gray-700 rounded px-1">v{status.version}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(status.capabilities).map(([feature, enabled]) => (
                    <span
                        key={feature}
                        className={`
                            px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider transition-colors
                            ${enabled
                                ? 'bg-blue-900/30 text-blue-300 border border-blue-700/30'
                                : 'bg-gray-800/50 text-gray-600 border border-gray-700/30 line-through decoration-gray-600'}
                        `}
                    >
                        {feature}
                    </span>
                ))}
            </div>

            <div className="flex gap-4 text-xs text-gray-400 font-mono pt-2 border-t border-gray-800/50">
                <div className="flex items-center gap-1">
                    <span>Workflows:</span>
                    <span className="text-gray-200 font-bold">{status.health.activeWorkflows}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span>Tools:</span>
                    <span className="text-gray-200 font-bold">{status.health.activeTools}</span>
                </div>
            </div>
        </div>
    );
}
