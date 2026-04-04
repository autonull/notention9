import React, {useEffect} from 'react';
import {agentService} from '../../services/AgentService';
import {useAgentStatus} from '../../hooks/index';

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

    const getStatusConfig = () => {
        if (agentStatus.status === 'offline') {
            if (!agentService.isEnabled()) {
                return {
                    bg: 'bg-gray-700', text: 'text-white', opacity: 'opacity-75 hover:opacity-100',
                    dot: 'bg-gray-400', label: 'Local Mode (Agent Disabled)'
                };
            }
            return {
                bg: 'bg-yellow-500', text: 'text-black', animate: 'animate-pulse',
                dot: 'bg-black', label: 'Offline Mode - Working locally'
            };
        }
        if (['connecting', 'reconnecting'].includes(agentStatus.status)) {
            return {
                bg: 'bg-blue-500', text: 'text-white',
                dot: 'bg-white animate-pulse',
                label: agentStatus.status === 'connecting' ? 'Connecting...' : 'Reconnecting...'
            };
        }
        if (agentStatus.status === 'connected') {
            return {
                bg: 'bg-green-500', text: 'text-white',
                dot: 'bg-white', label: 'Connected to Agent'
            };
        }
        return {
            bg: 'bg-gray-500', text: 'text-white', opacity: 'opacity-50',
            dot: 'bg-gray-300', label: agentStatus.status.charAt(0).toUpperCase() + agentStatus.status.slice(1)
        };
    };

    const config = getStatusConfig();

    const statusDisplay = (
        <div className={`fixed top-4 right-4 ${config.bg} ${config.text} px-4 py-2 rounded shadow-lg z-50 transition-opacity ${config.opacity || ''} ${config.animate || ''} pointer-events-none`}>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${config.dot}`}></div>
                {config.label}
            </div>
            {agentStatus.status === 'connected' && agentStatus.queueSize > 0 && (
                <div className="text-xs mt-1">Processing {agentStatus.queueSize} queued messages...</div>
            )}
        </div>
    );

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
