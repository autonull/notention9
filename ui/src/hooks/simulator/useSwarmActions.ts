import {useSimulatorContext} from '../useSimulatorContext';
import {SimulationAgent, SwarmTemplate} from './types';

export function useSwarmActions() {
    const {deploySwarm} = useSimulatorContext();

    const handleDeploySwarm = (template: SwarmTemplate, onSuccess?: () => void) => {
        const newAgents: SimulationAgent[] = template.agents.map(a => ({
            ...a,
            id: crypto.randomUUID(),
            currentDraft: '',
            status: 'Idle',
            isAgent: true
        }));
        deploySwarm(newAgents);
        if (onSuccess) onSuccess();
    };

    return {handleDeploySwarm};
}
