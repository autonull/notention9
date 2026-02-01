import React from 'react';
import { Modal } from '../common/Modal';
import { SimulatorAgentEditor } from './SimulatorAgentEditor';
import { Button } from '../common/Button';
import { TrashIcon, PauseIcon, PlayIcon } from '../common/icons';
import type { SimulationAgent } from '../../hooks/simulator/types';
import { SELF_AGENT_ID } from '../../hooks/simulator/types';

interface AgentSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    agent: SimulationAgent;
    onUpdate: (updates: Partial<SimulationAgent>) => void;
    onRandomize: () => void;
    onDelete: () => void;
    onToggle: () => void;
}

export function AgentSettingsModal({
    isOpen, onClose, agent, onUpdate, onRandomize, onDelete, onToggle
}: AgentSettingsModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Settings: ${agent.name}`}>
            <div className="space-y-4">
                <SimulatorAgentEditor
                    agent={agent}
                    onUpdate={onUpdate}
                    onRandomize={onRandomize}
                />

                <div className="flex justify-between items-center border-t border-gray-700 pt-4 mt-4">
                     <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            icon={agent.enabled === false ? PlayIcon : PauseIcon}
                            onClick={onToggle}
                        >
                            {agent.enabled === false ? 'Resume Agent' : 'Pause Agent'}
                        </Button>
                     </div>

                     {agent.id !== SELF_AGENT_ID && (
                         <Button
                            variant="danger"
                            icon={TrashIcon}
                            onClick={() => {
                                if(confirm('Are you sure you want to delete this agent?')) {
                                    onDelete();
                                    onClose();
                                }
                            }}
                         >
                            Delete Agent
                         </Button>
                     )}
                </div>
            </div>
        </Modal>
    );
};
