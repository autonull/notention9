import React from 'react';
import { AgentStatus } from '../agent/AgentStatus';

export function AgentTab() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium text-white">Agent Status</h3>
                <p className="text-sm text-gray-400">
                    Monitor the health and capabilities of your connected VoltAgent instance.
                </p>
            </div>

            <AgentStatus />

            <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/30">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">About VoltAgent</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                    VoltAgent is the intelligent backend for Notention. It handles semantic processing,
                    skill execution, and memory management. The agent runs locally or on a private server,
                    ensuring your data remains under your control.
                </p>
            </div>
        </div>
    );
}
