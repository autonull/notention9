import { BaseCommand } from './command.js';
import { log, withSpinner } from '../utils.js';
import chalk from 'chalk';

export class SecurityCommand extends BaseCommand {
    name = '/security';
    description = 'Security scan for secrets in notes';
    usage = '/security scan';

    validate(args: string[]): boolean {
        if (args.length === 0 || args[0] !== 'scan') {
            log.warn("Usage: /security scan");
            return false;
        }
        return true;
    }

    protected async run(args: string[]): Promise<boolean> {
        log.info("Starting security scan...");
        try {
            const result = await withSpinner("Scanning notes for secrets...", async () => {
                const notesResult = await this.cli.callTool('read_notes', { limit: 1000 });
                const content = (notesResult as any).content?.[0]?.text;
                if (!content) return [];
                return JSON.parse(content);
            });

            const notes = result as any[];
            const secrets: { id: string; title: string; type: string }[] = [];

            const patterns = [
                { type: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
                { type: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/ },
                { type: 'Generic Password', regex: /password\s*[:=]\s*\S+/i },
                { type: 'API Key', regex: /api_key\s*[:=]\s*\S+/i }
            ];

            notes.forEach((note: any) => {
                for (const p of patterns) {
                    if (p.regex.test(note.content)) {
                        secrets.push({ id: note.id, title: note.title, type: p.type });
                        break;
                    }
                }
            });

            if (secrets.length === 0) {
                log.success("No secrets found in notes.");
            } else {
                log.warn(`Found ${secrets.length} potential secrets!`);
                secrets.forEach(s => {
                    console.log(` - [${chalk.red(s.type)}] in "${s.title}" (${s.id})`);
                });
                console.log(chalk.yellow("Recommendation: Move these credentials to a secure vault or .env file."));
            }

        } catch (e: unknown) {
            log.error("Security scan failed", e);
        }
        return true;
    }
}