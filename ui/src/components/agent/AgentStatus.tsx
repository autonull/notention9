import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { AgentStatus as AgentStatusType } from '@notention/core';
import { Badge } from '../common/Badge';

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

    if (!status) {
        return (
            <div className="flex items-center justify-center p-8 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <div className="animate-pulse flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Connecting to agent...</span>
                </div>
            </div>
        );
    }

    const isRunning = status.state === 'running';

    return (
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-700/50 flex items-center justify-between bg-gray-800/30">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                    <h3 className="text-lg font-bold text-white tracking-wide">{status.state.toUpperCase()}</h3>
                </div>
                <Badge variant="ghost" size="sm" className="font-mono">v{status.version}</Badge>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">

                {/* Health Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/30">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Uptime</div>
                        <div className="text-xl font-mono text-blue-400">{formatUptime(status.uptime)}</div>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/30">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Active Workflows</div>
                        <div className="text-xl font-mono text-purple-400">{status.health.activeWorkflows}</div>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/30">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Active Tools</div>
                        <div className="text-xl font-mono text-green-400">{status.health.activeTools}</div>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/30">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Memory Usage</div>
                        <div className="text-xl font-mono text-yellow-400">
                            {formatMemory(status.health.memory.used)} / {formatMemory(status.health.memory.available)}
                        </div>
                    </div>
                </div>

                {/* Capabilities */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(status.capabilities).map(([feature, enabled]) => (
                            <div
                                key={feature}
                                className={`
                                    px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-2 transition-colors
                                    ${enabled
                                        ? 'bg-blue-900/20 border-blue-800/50 text-blue-300'
                                        : 'bg-gray-800/50 border-gray-700 text-gray-500 line-through decoration-gray-600'
                                    }
                                `}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-blue-400' : 'bg-gray-600'}`}></span>
                                {feature}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

function formatMemory(bytes: number): string {
    if (bytes === 0) return '0 MB'; // Mock or empty
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
}
