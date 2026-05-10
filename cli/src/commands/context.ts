import chalk from 'chalk';
import { CliClient } from '../client.js';
import { LlmSession } from '../llm.js';
import { log, withSpinner } from '../utils.js';

/**
 * Context management commands - open/close note context
 */

export const handleOpen = async (args: string[], cli: CliClient, session?: LlmSession): Promise<boolean> => {
    if (!session) {
        log.error("Session unavailable in this context.");
        return true;
    }

    if (args.length === 0) {
        log.warn("Usage: /open <note_id>");
        return true;
    }
    const noteId = args[0];

    try {
        const result = await withSpinner(`Fetching note '${noteId}'...`, () => cli.callTool('read_notes', { query: noteId }));
        const content = (result as any).content;
        const notes = JSON.parse((content[0] as any).text);

        const note = notes.find((n: any) => n.id === noteId);

        if (note) {
            session.setActiveContext({ id: note.id, title: note.title });
            log.success(`Context set to: ${chalk.bold(note.title)}`);
        } else {
            log.warn(`Note '${noteId}' not found.`);
        }
    } catch (e: unknown) {
        log.error("Failed to open note", e);
    }
    return true;
};

export const handleClose = async (_args: string[], _cli: CliClient, session?: LlmSession): Promise<boolean> => {
    if (!session) {
        log.error("Session unavailable in this context.");
        return true;
    }

    session.setActiveContext(null);
    log.success("Context closed.");
    return true;
};
