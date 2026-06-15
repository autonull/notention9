import {useCallback, useEffect} from 'react';
import type {Note} from '@notention/core';
import {Logger} from '@notention/core';
import {agentService} from '../../services/AgentService';
import {useEventSubscription} from '../useEventSubscription';

export function useAgentSync(
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>
) {
    const logger = Logger.getInstance();

    const handleConnected = useCallback(() => {
        logger.info('Connected to agent, syncing notes...');
        agentService.fetchNotes()
            .then((remoteNotes) => {
                if (remoteNotes && remoteNotes.length > 0) {
                    setNotes((prev) => {
                        const merged = [...prev];
                        remoteNotes.forEach((rNote) => {
                            const idx = merged.findIndex((l) => l.id === rNote.id);
                            if (idx >= 0) {
                                if (new Date(rNote.updatedAt) > new Date(merged[idx].updatedAt)) {
                                    merged[idx] = rNote;
                                }
                            } else {
                                merged.push(rNote);
                            }
                        });
                        return merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
                    });
                }
            })
            .catch((err) => logger.error('Failed to sync notes:', err as Error));
    }, [setNotes, logger]);

    useEventSubscription(agentService, {
        connected: handleConnected
    });

    useEffect(() => {
        if (agentService.isEnabled() && agentService.isConnected()) {
            handleConnected();
        }
    }, [handleConnected]);

    return {handleConnected};
}
