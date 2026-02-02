import React, { useEffect, useState, useRef } from 'react';
import { agentService } from '../../services/AgentService';
import { FeedbackWidget } from '../common/FeedbackWidget';
import { useNotes } from '../../hooks/useNotes';
import { useView } from '../../hooks/useViewContext';
import { skillService } from '../../services/SkillService';
import type { Skill } from '@notention/core';
import { Button } from '../common/Button';
import { PlayIcon } from '../common/icons';
import { useToast } from '../../hooks/useToast';
import { Logger } from '@notention/core';

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
    const { notes } = useNotes();
    const { selectedNoteId } = useView();
    const [matchingSkills, setMatchingSkills] = useState<Skill[]>([]);
    const { addToast } = useToast();

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
                        onFeedback={(type, val) => Logger.getInstance().info('Feedback:', { type, val })}
                    />
                    <button onClick={() => setLogs([])} className="hover:text-white">Clear</button>
                </div>
            </div>

            {/* Skill Actions */}
            {matchingSkills.length > 0 && (
                <div className="bg-gray-800/50 p-2 border-b border-gray-800">
                    <div className="text-xs font-bold text-purple-400 mb-2 uppercase tracking-wide">
                        Available Actions
                    </div>
                    <div className="space-y-2">
                        {matchingSkills.map(skill => (
                            <div key={skill.id} className="bg-gray-800 border border-gray-700 p-2 rounded flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-gray-200">{skill.name}</span>
                                    <span className="text-[10px] bg-purple-900/50 text-purple-300 px-1.5 rounded">
                                        Skill
                                    </span>
                                </div>
                                <p className="text-gray-400 text-[10px] leading-tight line-clamp-2">
                                    {skill.description}
                                </p>
                                <Button
                                    size="xs"
                                    variant="primary"
                                    icon={PlayIcon}
                                    onClick={() => handleRunSkill(skill)}
                                    className="w-full justify-center mt-1"
                                >
                                    Run Action
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-2" ref={scrollRef}>
                {logs.length === 0 && matchingSkills.length === 0 && (
                    <div className="text-gray-600 text-center py-8 italic">
                        No agent activity. <br/>
                        Create a note with properties to trigger skills.
                    </div>
                )}
                {logs.map(log => (
                    <div key={log.id} className="animate-fade-in border-l-2 border-gray-700 pl-2 py-1">
                        <div className="text-gray-500 mb-0.5 flex justify-between items-center" style={{ fontSize: '0.65rem' }}>
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={`uppercase font-bold ${
                                log.type === 'error' ? 'text-red-500' :
                                log.type === 'success' ? 'text-green-500' : 'text-blue-500'
                            }`}>{log.type}</span>
                        </div>

                        {log.type === 'screenshot' ? (
                            <div className="border border-gray-700 rounded overflow-hidden mt-1">
                                <img src={log.data} alt="Agent View" className="w-full h-auto" />
                            </div>
                        ) : (
                            <div className={`
                        ${log.type === 'error' ? 'text-red-300' : ''}
                        ${log.type === 'success' ? 'text-green-300' : ''}
                        ${log.type === 'info' ? 'text-gray-300' : ''}
                        break-words text-[11px] leading-tight
                    `}>
                                {log.message}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
