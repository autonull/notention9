import React, { useEffect, useState, useRef } from 'react';
import { agentService } from '../../services/AgentService';
import { FeedbackWidget } from '../common/FeedbackWidget';

interface LogEntry {
    id: string;
    timestamp: string;
    type: 'info' | 'error' | 'success' | 'screenshot';
    message?: string;
    data?: any;
}

export const AgentFeedbackPanel: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMessage = (data: any) => {
            let parsed = data;
            if (typeof data === 'string') {
                try { parsed = JSON.parse(data); } catch (e) { return; }
            }

            // Handle screenshot specifically
            if (parsed.type === 'screenshot') {
                const entry: LogEntry = {
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    type: 'screenshot',
                    data: parsed.payload // Assuming payload is base64 or url
                };
                setLogs(prev => [...prev, entry]);
            }
            // Handle general logs if the agent sends them (we might need to update agent to send 'log' events)
            else if (parsed.type === 'log') {
                const entry: LogEntry = {
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    type: parsed.level || 'info', // info, error, success
                    message: parsed.message
                };
                setLogs(prev => [...prev, entry]);
            }
            // For now, let's also log note_created events as success actions
            else if (parsed.type === 'note_created') {
                const entry: LogEntry = {
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    type: 'success',
                    message: `Agent created info: ${parsed.payload.title || 'Untitled'}`
                };
                setLogs(prev => [...prev, entry]);
            }
        };

        agentService.on('message', handleMessage);
        return () => agentService.off('message', handleMessage);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    if (logs.length === 0) return null;

    return (
        <div className="flex flex-col bg-gray-900 border-l border-gray-800 w-64 h-full text-xs font-mono">
            <div className="p-2 border-b border-gray-800 font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                <span>Agent Stream</span>
                <div className="flex items-center gap-2">
                    <FeedbackWidget
                        entityId="agent-stream"
                        onFeedback={(type, val) => console.log('Feedback:', type, val)}
                    />
                    <button onClick={() => setLogs([])} className="hover:text-white">Clear</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2" ref={scrollRef}>
                {logs.map(log => (
                    <div key={log.id} className="animate-fade-in">
                        <div className="text-gray-500 mb-0.5" style={{ fontSize: '0.65rem' }}>
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </div>

                        {log.type === 'screenshot' ? (
                            <div className="border border-gray-700 rounded overflow-hidden mt-1">
                                <img src={log.data} alt="Agent View" className="w-full h-auto" />
                            </div>
                        ) : (
                            <div className={`
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'success' ? 'text-green-400' : ''}
                        ${log.type === 'info' ? 'text-blue-300' : ''}
                        break-words
                    `}>
                                {log.type === 'success' && '✓ '}
                                {log.type === 'error' && '✗ '}
                                {log.message}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
