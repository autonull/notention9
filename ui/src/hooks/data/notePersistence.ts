import type { Note, OntologyNode } from '@notention/core';
import { publishDeletionRequest, networkRegistry } from '@notention/core';
import { agentService } from '../../services/AgentService';
import { createScopedLogger } from '../logging.js';

const log = createScopedLogger('notePersistence');

interface NostrSettings {
    privkey?: string;
    relays?: string[];
}

interface PersistenceContext {
    settingsOntology: OntologyNode[];
    settingsNostr?: NostrSettings;
    log?: typeof log;
}

/**
 * Consolidated persistence logic for saving notes to agent and publishing to networks.
 * Save and publish are separate operations - save is local, publish is explicit.
 */
export function createNotePersistence({settingsOntology, settingsNostr, log = createScopedLogger('notePersistence')}: PersistenceContext) {
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

    /** NIP-09 is best-effort: relays may ignore it, and it never blocks the local delete. */
    const requestRemoteDeletion = (note: Note) => {
        if (!note.nostrEventId) return;

        publishDeletionRequest(
            note,
            settingsNostr?.privkey || undefined,
            settingsNostr?.relays?.length ? settingsNostr.relays : undefined,
        ).catch((error) => {
            log.warn('Deletion request failed', error as Error);
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
        persistHardDelete: (note: Note | string) => {
            if (typeof note === 'string') {
                agentService.deleteNote(note);
                return;
            }
            agentService.deleteNote(note.id);
            requestRemoteDeletion(note);
        }
    };
}
