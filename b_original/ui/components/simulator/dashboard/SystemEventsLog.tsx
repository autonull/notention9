import React from 'react';
import { getLogStyle } from '../../../utils/ui';

export interface Log {
    type: string;
    msg: string;
}

export function SystemEventsLog({ logs }: { logs: Log[] }) {
  return (
    <>
        <div className="bg-gray-800 px-3 py-2 border-b border-gray-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-blue-500/50 shadow-sm"></span>
            <span className="font-bold text-xs text-gray-300 tracking-wide">SYSTEM EVENTS</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px] custom-scrollbar bg-gray-950/50">
            {logs.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-600 italic">No events yet.</div>
            )}
            {logs.map((log, i) => (
                <div key={i} className={`p-1.5 border-l-2 rounded-r transition-all animate-fade-in ${getLogStyle(log.type)}`}>
                    {log.msg}
                </div>
            ))}
        </div>
    </>
  );
}
