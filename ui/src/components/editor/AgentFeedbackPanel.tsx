import React, {useEffect, useRef, useState} from 'react';
import {agentService} from '../../services/AgentService';
import {FeedbackWidget} from '../common/FeedbackWidget';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {skillService} from '../../services/SkillService';
import type {Skill} from '@notention/core';
import {Logger} from '@notention/core';
import {Button} from '../common/Button';
import {PlayIcon} from '../common/icons';
import {useToast} from '../../hooks/useToast';

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
    const {notes} = useNotes();
    const {selectedNoteId} = useView();
    const [matchingSkills, setMatchingSkills] = useState<Skill[]>([]);
    const {addToast} = useToast();

    // Check for matching skills
    useEffect(() => {
        const note = notes.find(n => n.id === selectedNoteId);
        if (note) {
            const skills = skillService.getRegistry().findMatching(note);
            setMatchingSkills(skills);
        } else {
            setMatchingSkills([]);
        }
    }, [selectedNoteId, notes]);

    const handleRunSkill = (skill: Skill) => {
        addToast(`Executing ${skill.name}...`, 'info');

        // Mock execution
        setTimeout(() => {
            const entry: LogEntry = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                type: 'success',
                message: `Executed ${skill.name} successfully.`
            };
            setLogs(prev => [...prev, entry]);
            addToast(`Skill ${skill.name} completed`, 'success');
        }, 1500);
    };

    useEffect(() => {
        const handleMessage = (data: any) => {
            let parsed = data;
            if (typeof data === 'string') {
                try {
                    parsed = JSON.parse(data);
                } catch (e) {
                    Logger.getInstance().debug('Failed to parse agent message', {data, error: e});
                    return;
                }
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

    const isEmpty = logs.length === 0 && matchingSkills.length === 0;

    return (
        <div className="w-full border-t border-gray-700/50 bg-gray-900/90 backdrop-blur-md shadow-2xl flex flex-col max-h-64 font-mono text-xs z-20 absolute bottom-0">
            {/* Header/Status Bar */}
            <div className="p-2 border-b border-gray-800/50 flex justify-between items-center bg-gray-800/50 cursor-pointer">
                <div className="flex items-center gap-3">
                    <span className="text-purple-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <span className="animate-pulse">⚡</span> Agent Stream
                    </span>
                    {!isEmpty && (
                        <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full text-[10px]">
                            {logs.length} events
                        </span>
                    )}
                </div>
                {!isEmpty && (
                    <div className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
                        <FeedbackWidget
                            entityId="agent-stream"
                            onFeedback={(type, val) => Logger.getInstance().info('Feedback:', {type, val})}
                        />
                        <button onClick={() => setLogs([])} className="text-gray-400 hover:text-white bg-gray-800 px-2 py-1 rounded">Clear</button>
                    </div>
                )}
            </div>

            {/* Content Area - Auto-hides when empty */}
            {!isEmpty && (
                <div className="flex flex-row overflow-hidden flex-1">
                    {/* Log Stream */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 border-r border-gray-800/50" ref={scrollRef}>
                        {logs.length === 0 && (
                            <div className="text-gray-600 italic h-full flex items-center justify-center">
                                Waiting for agent activity...
                            </div>
                        )}
                        {logs.map(log => (
                            <div key={log.id} className="animate-fade-in flex gap-3 group hover:bg-gray-800/30 p-1 -mx-1 rounded">
                                <div className="text-gray-500 w-16 flex-shrink-0 pt-0.5" style={{fontSize: '0.65rem'}}>
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>

                                <div className="flex-1">
                                    <div className="mb-0.5 flex items-center gap-2">
                                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-gray-800 ${
                                            log.type === 'error' ? 'text-red-400 border border-red-900/50' :
                                                log.type === 'success' ? 'text-green-400 border border-green-900/50' : 'text-blue-400 border border-blue-900/50'
                                        }`}>{log.type}</span>
                                    </div>

                                    {log.type === 'screenshot' ? (
                                        <div className="border border-gray-700 rounded overflow-hidden mt-2 max-w-sm">
                                            <img src={log.data} alt="Agent View" className="w-full h-auto"/>
                                        </div>
                                    ) : (
                                        <div className={`
                                            ${log.type === 'error' ? 'text-red-300' : ''}
                                            ${log.type === 'success' ? 'text-green-300' : ''}
                                            ${log.type === 'info' ? 'text-gray-300' : ''}
                                            break-words text-sm
                                        `}>
                                            {log.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Available Skills Sidebar (Right) */}
                    {matchingSkills.length > 0 && (
                        <div className="w-64 bg-gray-800/20 p-3 overflow-y-auto">
                            <div className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-wider">
                                Recommended Actions
                            </div>
                            <div className="space-y-3">
                                {matchingSkills.map(skill => (
                                    <div key={skill.id}
                                         className="bg-gray-800/80 border border-gray-700 p-2.5 rounded-lg group hover:border-purple-500/50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-gray-200">{skill.name}</span>
                                        </div>
                                        <p className="text-gray-400 text-[11px] leading-tight line-clamp-2 mb-2">
                                            {skill.description}
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            icon={PlayIcon}
                                            onClick={() => handleRunSkill(skill)}
                                            className="w-full justify-center bg-gray-700 hover:bg-purple-600 hover:text-white hover:border-purple-500 text-xs py-1"
                                        >
                                            Run
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
