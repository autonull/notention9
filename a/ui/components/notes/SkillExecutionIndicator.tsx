import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

const Spinner = () => (
    <div className="animate-spin h-3 w-3 border-2 border-purple-500 border-t-transparent rounded-full mr-2"></div>
);

export function SkillExecutionIndicator({ noteId }: { noteId: string }) {
    const [executing, setExecuting] = useState(false);
    const [matchedSkills, setMatchedSkills] = useState<string[]>([]);

    const { subscribe } = useWebSocket();

    useEffect(() => {
        const unsubscribe = subscribe((message: any) => {
            if (!message || typeof message !== 'object') return;

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
        <div className="flex items-center text-xs text-purple-400 mt-1 animate-fade-in bg-purple-900/10 px-2 py-1 rounded-md w-fit border border-purple-500/20">
            <Spinner />
            <span className="font-medium tracking-wide">
                {matchedSkills.length > 0 ? `Running: ${matchedSkills.join(', ')}` : 'Agent working...'}
            </span>
        </div>
    );
}
