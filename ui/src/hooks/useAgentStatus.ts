import {useState} from 'react';
import {agentService} from '../services/AgentService';
import {useEventSubscription} from './useEventSubscription';

export function useAgentStatus() {
    const [status, setStatus] = useState(agentService.getStatus());

    useEventSubscription(agentService, {
        status_change: (newStatus) => setStatus(newStatus),
        queued: () => setStatus(agentService.getStatus()),
        sent: () => setStatus(agentService.getStatus()),
        error: () => setStatus(agentService.getStatus())
    });

    return status;
}
