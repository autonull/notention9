import * as readline from 'readline';
import dotenv from 'dotenv';
import { CliClient } from './client.js';
import { handleSlashCommand } from './commands.js';
import { LlmSession } from './llm.js';

dotenv.config();

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';

async function main() {
    const cli = new CliClient(MCP_URL);
    try {
        await cli.connect();
        console.log(`Connected to Notention Agent at ${MCP_URL}`);

        const toolsResult = await cli.listTools();
        const tools = toolsResult.tools;

        const session = new LlmSession(cli, tools);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log("Welcome to Notention CLI.");
        console.log("Type /help for commands, or just chat with the agent.");

        const ask = () => {
            rl.question('> ', async (rawInput) => {
                const input = rawInput.trim();

                if (!input) {
                    ask();
                    return;
                }

                if (input.startsWith('/')) {
                    await handleSlashCommand(input, cli, tools);
                } else {
                    await session.handleInteraction(input);
                }

                ask();
            });
        };

        ask();

    } catch (e) {
        console.error("Failed to connect:", e);
        process.exit(1);
    }
}

// Check if running directly
// @ts-ignore
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
