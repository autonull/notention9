import React, {useEffect} from 'react';
import {agentService} from '../../services/AgentService';
import {useAgentStatus} from '../../hooks/useAgentStatus';

export function AgentStatusIndicator() {
    const agentStatus = useAgentStatus();

    useEffect(() => {
        // Attempt initial connection if enabled
        if (agentService.isEnabled() && !agentService.isConnected()) {
            agentService.connect();
        }

        const handleBrowserOnline = () => {
            // Try to reconnect when browser comes online
            if (agentStatus.status === 'offline') {
                agentService.reconnect();
            }
        };

        window.addEventListener('online', handleBrowserOnline);
        return () => {
            window.removeEventListener('online', handleBrowserOnline);
        };
    }, []); // Run once on mount

    // Determine UI status display
    let statusDisplay = null;
    const status = agentStatus.status;

    if (status === 'offline') {
        // Check if explicitly disabled to show different message
        if (!agentService.isEnabled()) {
            statusDisplay = (
                <div
                    className="fixed top-4 right-4 bg-gray-700 text-white px-4 py-2 rounded shadow-lg z-50 opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        Local Mode (Agent Disabled)
                    </div>
                </div>
            );
        } else {
            statusDisplay = (
                <div
                    className="fixed top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded shadow-lg z-50 animate-pulse">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-black rounded-full"></span>
                        Offline Mode - Working locally
                    </div>
                </div>
            );
        }
    } else if (status === 'connecting' || status === 'reconnecting') {
        statusDisplay = (
            <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    {status === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
                </div>
            </div>
        );
    } else if (status === 'connected') {
        statusDisplay = (
            <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    Connected to Agent
                </div>
                {agentStatus.queueSize > 0 && (
                    <div className="text-xs mt-1">Processing {agentStatus.queueSize} queued messages...</div>
                )}
            </div>
        );
    } else {
        // Fallback/Disconnected state
        statusDisplay = (
            <div className="fixed top-4 right-4 bg-gray-500 text-white px-4 py-2 rounded shadow-lg z-50 opacity-50">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
            </div>
        );
    }

    // Show error notification if there's an error
    let errorDisplay = null;
    if (agentStatus.lastError) {
        errorDisplay = (
            <div className="fixed top-16 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 max-w-xs">
                <div className="text-sm">Agent Error: {agentStatus.lastError}</div>
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
