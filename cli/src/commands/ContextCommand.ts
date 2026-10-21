import { BaseCommand } from './command.js';
import { CliClient } from '../client.js';
import { log, withSpinner } from '../utils.js';
import chalk from 'chalk';

export class OpenCommand extends BaseCommand {
    name = '/open';
    description = 'Set active context to a note';
    usage = '/open <note_id>';

    validate(args: string[]): boolean {
        if (args.length === 0) {
            log.warn("Usage: /open <note_id>");
            return false;
        }
        return true;
    }

    protected async run(args: string[]): Promise<boolean> {
        const noteId = args[0];

        try {
            const result = await withSpinner(`Fetching note '${noteId}'...`, () => this.cli.callTool('read_notes', { query: noteId }));
            const content = (result as any).content;
            const notes = JSON.parse((content[0] as any).text);

            const note = notes.find((n: any) => n.id === noteId);

            if (note) {
                this.session!.setActiveContext({ id: note.id, title: note.title });
                log.success(`Context set to: ${chalk.bold(note.title)}`);
            } else {
                log.warn(`Note '${noteId}' not found.`);
            }
        } catch (e: unknown) {
            log.error("Failed to open note", e);
        }
        return true;
    }
}

export class CloseCommand extends BaseCommand {
    name = '/close';
    description = 'Clear active context';
    usage = '/close';

    protected async run(_args: string[]): Promise<boolean> {
        this.session!.setActiveContext(null);
        log.success("Context closed.");
        return true;
    }
}