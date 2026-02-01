import React from 'react';
import type { SimulationAgent } from '../../hooks/simulator/types';
import { SparklesIcon } from '../common/icons';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';

interface SimulatorAgentEditorProps {
    agent: SimulationAgent;
    onUpdate: (updates: Partial<SimulationAgent>) => void;
    onRandomize: () => void;
}

export function SimulatorAgentEditor({
    agent,
    onUpdate,
    onRandomize
}: SimulatorAgentEditorProps) {
  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 shadow-sm flex flex-col gap-3 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
                <Input
                    label="Name"
                    value={agent.name}
                    onChange={e => onUpdate({ name: e.target.value })}
                    placeholder="Agent Name"
                />
                 <Textarea
                     label="Bio"
                     value={agent.bio}
                     onChange={e => onUpdate({ bio: e.target.value })}
                     placeholder="Brief description..."
                     rows={2}
                 />
            </div>
            <div className="space-y-3">
                <Textarea
                    label="Persona (System Prompt)"
                    value={agent.persona}
                    onChange={e => onUpdate({ persona: e.target.value })}
                    placeholder="You are..."
                    rows={2}
                />
                <Textarea
                    label="Goal"
                    value={agent.goal}
                    onChange={e => onUpdate({ goal: e.target.value })}
                    placeholder="Current objective..."
                    rows={1}
                />
            </div>
        </div>
        <div className="flex justify-end border-t border-gray-800 pt-3">
            <Button
                onClick={onRandomize}
                variant="secondary"
                size="xs"
                icon={SparklesIcon}
            >
                Randomize Identity
            </Button>
        </div>
    </div>
  );
};
