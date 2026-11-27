import { BaseCommand, type CommandContext } from './command.js';
import { CliClient } from '../client.js';
import { log, withSpinner } from '../utils.js';
import chalk from 'chalk';

export const OpenCommand = BaseCommand.create({
    name: '/open',
    description: 'Set active context to a note',
    usage: '/open <note_id>',
    execute: async (parsed, context: CommandContext) => {
        const noteId = parsed.positional[0];
        if (!noteId) {
            parsed.printError('Note ID required');
            parsed.printUsage();
            return false;
        }

        try {
            const result = await withSpinner(`Fetching note '${noteId}'...`, () => context.cli.callTool('read_notes', { query: noteId }));
            const content = (result as any).content;
            const notes = JSON.parse((content[0] as any).text);

            const note = notes.find((n: any) => n.id === noteId);

            if (note) {
                context.session!.setActiveContext({ id: note.id, title: note.title });
                log.success(`Context set to: ${chalk.bold(note.title)}`);
            } else {
                log.warn(`Note '${noteId}' not found.`);
            }
        } catch (e: unknown) {
            parsed.printError("Failed to open note", e);
        }
        return true;
    }
});

export const CloseCommand = BaseCommand.create({
    name: '/close',
    description: 'Clear active context',
    usage: '/close',
    execute: async (_parsed, context: CommandContext) => {
        context.session!.setActiveContext(null);
        log.success("Context closed.");
        return true;
    }
});