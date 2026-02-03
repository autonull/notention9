import React from 'react';
import { AgentSessionWrapper } from './AgentSessionWrapper';
import { AgentSessionView } from './AgentSessionView';
import { SimulatorAgentEditor } from './SimulatorAgentEditor';
import type { SimulationAgent } from '../../hooks/simulator/types';
import type { Note, OntologyNode } from '@notention/core';

interface SimulatorAgentViewProps {
    agent: SimulationAgent;
    isActive: boolean;
    onUpdateAgent: (updates: Partial<SimulationAgent>) => void;
    onRandomizeAgent: () => void;
    onPublish: (note: Note) => void;
    notifications: string[];
    ontology: OntologyNode[];
}

export function SimulatorAgentView({
    agent,
    isActive,
    onUpdateAgent,
    onRandomizeAgent,
    onPublish,
    notifications,
    ontology
}: SimulatorAgentViewProps) {
    return (
        <div className="h-full flex flex-col gap-2">
            {!isActive && (
                <SimulatorAgentEditor
                    agent={agent}
                    onUpdate={onUpdateAgent}
                    onRandomize={onRandomizeAgent}
                />
            )}

            <div className="flex-1 overflow-hidden">
                <AgentSessionWrapper agentId={agent.id} ontology={ontology}>
                    <AgentSessionView
                        agentName={agent.name}
                        currentDraft={agent.currentDraft}
                        onDraftChange={(val) => onUpdateAgent({ currentDraft: val })}
                        status={agent.status}
                        onPublish={onPublish}
                        notifications={notifications}
                    />
                </AgentSessionWrapper>
            </div>
        </div>
    );
};
