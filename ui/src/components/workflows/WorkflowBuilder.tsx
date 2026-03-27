import React, { useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useToast } from '../../hooks/useToast';

interface WorkflowStep {
    agent: string;
    instruction: string;
}

export function WorkflowBuilder() {
    const [name, setName] = useState('');
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const { sendMessage } = useWebSocket();
    const { addToast } = useToast();

    const addStep = () => {
        setSteps([...steps, { agent: 'semantic-processor', instruction: '' }]);
    };

    const updateStep = (index: number, field: keyof WorkflowStep, value: string) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSteps(newSteps);
    };

    const saveWorkflow = () => {
        // Basic mock save
        const workflow = {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            steps: steps.map(s => ({
                agent: s.agent,
                prompt: s.instruction,
                output: 'result'
            }))
        };

        console.log('Saving workflow:', workflow);
        // In real implementation, send to agent to register
        // sendMessage({ type: 'register_workflow', payload: workflow });
        addToast(`Workflow "${name}" saved (mock)!`, 'success');
    };

    return (
        <div className="workflow-builder" style={{ padding: '20px', border: '1px solid #eee' }}>
            <h3>Workflow Builder</h3>

            <div style={{ marginBottom: '15px' }}>
                <label>Workflow Name: </label>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Research Topic"
                    style={{ padding: '5px' }}
                />
            </div>

            <div className="steps-container">
                {steps.map((step, idx) => (
                    <div key={idx} className="step" style={{
                        padding: '10px',
                        background: '#f9f9f9',
                        marginBottom: '10px',
                        borderRadius: '4px'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Step {idx + 1}</div>

                        <div style={{ marginBottom: '5px' }}>
                            <label>Agent: </label>
                            <select
                                value={step.agent}
                                onChange={e => updateStep(idx, 'agent', e.target.value)}
                            >
                                <option value="semantic-processor">Semantic Processor</option>
                                <option value="skill-executor">Skill Executor</option>
                            </select>
                        </div>

                        <div>
                            <label>Instruction: </label>
                            <textarea
                                value={step.instruction}
                                onChange={e => updateStep(idx, 'instruction', e.target.value)}
                                placeholder="What should this step do?"
                                style={{ width: '100%', height: '60px' }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="actions" style={{ marginTop: '15px' }}>
                <button onClick={addStep} style={{ marginRight: '10px' }}>+ Add Step</button>
                <button onClick={saveWorkflow} disabled={!name || steps.length === 0} style={{ background: '#0070f3', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px' }}>
                    Save Workflow
                </button>
            </div>
        </div>
    );
}
