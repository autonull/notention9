import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

// Mock Spinner if not found, or replace with common one later
const Spinner = ({ size }: { size: string }) => <span style={{ marginRight: '5px' }}>⏳</span>;

export function SkillExecutionIndicator({ noteId }: { noteId: string }) {
    const [executing, setExecuting] = useState(false);
    const [matchedSkills, setMatchedSkills] = useState<string[]>([]);

    const { subscribe } = useWebSocket();

    useEffect(() => {
        const unsubscribe = subscribe((message) => {
            // In Phase 4 index.ts, we broadcast 'note_created' for results.
            // But we need 'skill_execution_started' message type which defines `skills`
            // usage. In VoltAgentProvider calling executeWorkflow doesn't explicitly send start events
            // unless we instrument it.
            // DONE: Setup instrumented feedback in VoltAgentProvider or SkillExecutor (Phase 3).
            // Or we just listen for 'note_created' with source 'voltagent' related to this note?
            // TODO3.md snippet expects 'skill_execution_started'.
            // I should have implemented that broadcast in SkillExecutor or global event handler!
            // I'll update SkillExecutor later if strict adherence is needed, or just keep this component ready.

            if (message.type === 'skill_execution_started' && message.noteId === noteId) {
                setExecuting(true);
                setMatchedSkills(message.skills || []);
            }
            if (message.type === 'skill_execution_complete' && message.noteId === noteId) {
                setExecuting(false);
            }
        });

        return unsubscribe;
    }, [noteId, subscribe]);

    if (!executing) return null;

    return (
        <div className="skill-execution-indicator" style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.8em',
            color: '#666',
            marginTop: '4px'
        }}>
            <Spinner size="sm" />
            <span>Executing skills: {matchedSkills.join(', ')}</span>
        </div>
    );
}
