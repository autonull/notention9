import React from 'react';
import { Badge } from '../common/Badge';

interface SessionHeaderProps {
    agentName: string;
    status: string;
    minimal?: boolean;
}

export function SessionHeader({
    agentName,
    status,
    minimal = false
}: SessionHeaderProps) {
    return (
        <div className={`bg-gray-800 px-3 flex justify-between items-center border-b border-gray-700 ${minimal ? 'py-1.5' : 'py-2'}`}>
            <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${status === 'Error' ? 'bg-red-500 shadow-red-500/50' : 'bg-green-500 shadow-green-500/50'}`}></div>
                <span className={`font-bold text-gray-200 tracking-wide ${minimal ? 'text-xs' : 'text-sm'}`}>{agentName}</span>
            </div>

            <Badge variant="default" size="sm" className="bg-gray-900/50 border-gray-700/50 flex items-center gap-1.5 font-mono">
                {status === 'Typing...' && <span className="animate-pulse">⌨️</span>}
                <span className="uppercase tracking-wider">{status}</span>
            </Badge>
        </div>
    );
};
