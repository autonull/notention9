import { useSimulatorContext } from '../useSimulatorContext';
import { SwarmTemplate, SimulationAgent } from './types';

export function useSwarmActions() {
    const { deploySwarm } = useSimulatorContext();

    const handleDeploySwarm = (template: SwarmTemplate, onSuccess?: () => void) => {
        const newAgents: SimulationAgent[] = template.agents.map(a => ({
            ...a,
            id: Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
            currentDraft: '',
            status: 'Idle',
            isAgent: true
        }));
        deploySwarm(newAgents);
        if (onSuccess) onSuccess();
    };

    return { handleDeploySwarm };
}
