import React, {useEffect, useState} from 'react';
import {agentService} from '../../services/AgentService';
import {AgentStatus as AgentStatusType} from '@notention/core';
import {Badge} from '../ui/Badge';

interface AgentMessage {
    type: string;
    payload?: AgentStatusType;
    [key: string]: unknown;
}

export function AgentStatus() {
    const [status, setStatus] = useState<AgentStatusType | null>(null);


    useEffect(() => {
        if (!agentService.isEnabled()) return;

        const handler = (message: AgentMessage) => {
            if (message.type === 'agent_status') {
                setStatus(message.payload ?? null);
            }
        };

        agentService.on('message', handler);

        const fetchStatus = () => {
            if (agentService.isConnected) {
                agentService.send(JSON.stringify({type: 'get_agent_status'}));
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 10000); // Poll every 10s

        return () => {
            clearInterval(interval);
            agentService.off('message', handler);
        };
    }, []);

    if (!agentService.isEnabled()) {
        return (
            <div className="bg-[var(--app-surface)] border border-[var(--app-line)] rounded-lg p-4 text-center text-[var(--app-muted)] text-sm">
                Local Mode (Agent Disabled)
            </div>
        );
    }

    if (!status) {
        return (
            <div
                className="flex items-center justify-center p-8 text-[var(--app-muted)] bg-[var(--app-surface)] rounded-lg border border-[var(--app-line)]">
                <div className="animate-pulse flex items-center gap-2">
                    <div className="w-2 h-2 bg-[var(--app-accent)] rounded-full"></div>
                    <span>Connecting to agent...</span>
                </div>
            </div>
        );
    }

    const isRunning = status.state === 'running';

    return (
        <div className="bg-[var(--app-surface)] border border-[var(--app-line)] rounded-lg overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[var(--app-line)] flex items-center justify-between bg-[var(--app-panel)]">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}/>
                    <h3 className="text-lg font-bold text-[var(--app-text)] tracking-wide">{status.state.toUpperCase()}</h3>
                </div>
                <Badge variant="outline" size="sm" className="font-mono">v{status.version}</Badge>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">

                {/* Health Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[var(--app-raised)] p-3 rounded-lg border border-[var(--app-line)]">
                        <div className="text-xs text-[var(--app-muted)] font-semibold mb-1">Uptime</div>
                        <div className="text-xl font-mono text-[var(--app-accent-text)]">{formatUptime(status.uptime)}</div>
                    </div>
                    <div className="bg-[var(--app-raised)] p-3 rounded-lg border border-[var(--app-line)]">
                        <div className="text-xs text-[var(--app-muted)] font-semibold mb-1">Active Workflows</div>
                        <div className="text-xl font-mono text-[var(--app-accent-text)]">{status.health.activeWorkflows}</div>
                    </div>
                    <div className="bg-[var(--app-raised)] p-3 rounded-lg border border-[var(--app-line)]">
                        <div className="text-xs text-[var(--app-muted)] font-semibold mb-1">Active Tools</div>
                        <div className="text-xl font-mono text-green-400">{status.health.activeTools}</div>
                    </div>
                    <div className="bg-[var(--app-raised)] p-3 rounded-lg border border-[var(--app-line)]">
                        <div className="text-xs text-[var(--app-muted)] font-semibold mb-1">Memory Usage</div>
                        <div className="text-xl font-mono text-yellow-400">
                            {formatMemory(status.health.memory.used)} / {formatMemory(status.health.memory.available)}
                        </div>
                    </div>
                </div>

                {/* Capabilities */}
                <div>
                    <h4 className="text-sm font-semibold text-[var(--app-muted)] mb-3 tracking-wider">Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(status.capabilities).map(([feature, enabled]) => (
                            <div
                                key={feature}
                                className={`
                                    px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-2 transition-colors
                                    ${enabled
                                    ? 'bg-[var(--app-accent-soft)] border-[var(--app-accent-line)] text-[var(--app-accent-text)]'
                                    : 'bg-[var(--app-raised)] border-[var(--app-line)] text-[var(--app-muted)] line-through decoration-[var(--app-line-strong)]'
                                }
                                `}
                            >
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-faint)]'}`}></span>
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
