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
 * Eliminates duplication between addNote, updateNote, upsertNote, deleteNote, restoreNote.
 */
export function createNotePersistence({ settingsOntology, log = createScopedLogger('notePersistence') }: PersistenceContext) {
    const saveAndPublish = (note: Note) => {
        agentService.saveNote(note);

        networkRegistry.getActiveProviders().forEach((provider) => {
            provider.sendNote(note, settingsOntology).catch((error) => {
                log.warn('Background publish failed', error as Error);
            });
        });
    };

    return {
        saveAndPublish,
        persistAdd: (note: Note) => saveAndPublish(note),
        persistUpdate: (note: Note) => saveAndPublish(note),
        persistDelete: (note: Note) => {
            agentService.saveNote(note);
        },
        persistRestore: (note: Note) => saveAndPublish(note),
        persistHardDelete: (id: string) => {
            agentService.deleteNote(id);
        }
    };
}