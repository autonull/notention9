import {useEffect, useState} from 'react';
import {agentService} from '../services/AgentService';

export function useAgentStatus() {
    const [status, setStatus] = useState(agentService.getStatus());

    useEffect(() => {
        const handleStatusChange = (newStatus: any) => {
            setStatus(newStatus);
        };

        const handleQueueChange = () => {
            setStatus(agentService.getStatus());
        };

        const handleError = () => {
            setStatus(agentService.getStatus());
        };

        agentService.on('status_change', handleStatusChange);
        agentService.on('queued', handleQueueChange);
        agentService.on('sent', handleQueueChange);
        agentService.on('error', handleError);

        return () => {
            agentService.off('status_change', handleStatusChange);
            agentService.off('queued', handleQueueChange);
            agentService.off('sent', handleQueueChange);
            agentService.off('error', handleError);
        };
    }, []);

    return status;
}
