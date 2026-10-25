import { createCommand, CommandContext } from './command.js';
import { log, withSpinner } from '../utils.js';
import chalk from 'chalk';
import { validators } from './validators.js';

const SECRET_PATTERNS = [
    { type: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
    { type: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/ },
    { type: 'Generic Password', regex: /password\s*[:=]\s*\S+/i },
    { type: 'API Key', regex: /api_key\s*[:=]\s*\S+/i }
];

export const SecurityCommand = createCommand({
    name: '/security',
    description: 'Security scan for secrets in notes',
    usage: '/security scan',
    validate: validators.oneOf(['scan'], 'subcommand'),
    run: async (_args: string[], context: CommandContext) => {
        log.info("Starting security scan...");
        try {
            const result = await withSpinner("Scanning notes for secrets...", async () => {
                const notesResult = await context.cli.callTool('read_notes', { limit: 1000 });
                const content = (notesResult as any).content?.[0]?.text;
                if (!content) return [];
                return JSON.parse(content);
            });

            const notes = result as any[];
            const secrets: { id: string; title: string; type: string }[] = [];

            notes.forEach((note: any) => {
                for (const p of SECRET_PATTERNS) {
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
});