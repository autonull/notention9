import React from 'react';
import { agentService } from '../services/AgentService';

interface AgentStatusProps {
    status: any;
}

export function AgentStatusIndicator({ status }: AgentStatusProps) {
    let statusDisplay = null;
    if (status.status === 'offline') {
        statusDisplay = (
            <div className="fixed top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded shadow-lg z-50 animate-pulse">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    Offline Mode - Working locally
                </div>
            </div>
        );
    } else if (status.status === 'connecting' || status.status === 'reconnecting') {
        statusDisplay = (
            <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    {status.status === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
                </div>
            </div>
        );
    } else if (status.status === 'connected') {
        statusDisplay = (
            <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    Connected to Agent
                </div>
                {status.queueSize > 0 && (
                    <div className="text-xs mt-1">Processing {status.queueSize} queued messages...</div>
                )}
            </div>
        );
    }

    let errorDisplay = null;
    if (status.lastError) {
        errorDisplay = (
            <div className="fixed top-16 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 max-w-xs">
                <div className="text-sm">Agent Error: {status.lastError}</div>
                <button
                    onClick={() => agentService.reconnect()}
                    className="mt-1 text-xs underline hover:no-underline"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <>
            {statusDisplay}
            {errorDisplay}
        </>
    );
}
