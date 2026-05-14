import React from 'react';
import {useAgentStatus} from '../../hooks/useAgentStatus';

export function ConnectionStatus() {
    const {isOnline, status, queueSize} = useAgentStatus();

    let colorClass = 'bg-gray-500';
    let title = 'Disconnected';

    if (status === 'connected') {
        colorClass = 'bg-green-500';
        title = 'Online';
    } else if (status === 'connecting' || status === 'reconnecting') {
        colorClass = 'bg-yellow-500 animate-pulse';
        title = 'Connecting...';
    } else if (status === 'offline') {
        colorClass = 'bg-gray-400';
        title = 'Offline Mode';
    }

    return (
        <div className="flex items-center gap-1.5 px-2" title={title}>
            <div className={`w-1.5 h-1.5 rounded-full ${colorClass}`}/>
            {queueSize > 0 && (
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                    {queueSize}
                </span>
            )}
        </div>
    );
}
