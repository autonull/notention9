import type { Note, OntologyNode } from '@notention/core';
import { agentService } from '../../services/AgentService';
import { networkRegistry } from '@notention/core';
import { createScopedLogger } from '../logging.js';

const log = createScopedLogger('notePersistence');

interface PersistenceContext {
    settingsOntology: OntologyNode[];
    log?: typeof log;
}

/**
 * Consolidated persistence logic for saving notes to agent and publishing to networks.
 * Save and publish are separate operations - save is local, publish is explicit.
 */
export function createNotePersistence({ settingsOntology, log = createScopedLogger('notePersistence') }: PersistenceContext) {
    const saveLocal = (note: Note) => {
        agentService.saveNote(note);
    };

    const publish = (note: Note) => {
        networkRegistry.getActiveProviders().forEach((provider) => {
            provider.sendNote(note, settingsOntology).catch((error) => {
                log.warn('Background publish failed', error as Error);
            });
        });
    };

    return {
        saveLocal,
        publish,
        persistAdd: (note: Note) => saveLocal(note),
        persistUpdate: (note: Note) => saveLocal(note),
        persistDelete: (note: Note) => {
            agentService.saveNote(note);
        },
        persistRestore: (note: Note) => saveLocal(note),
        persistPublish: (note: Note) => publish(note),
        persistHardDelete: (id: string) => {
            agentService.deleteNote(id);
        }
    };
}