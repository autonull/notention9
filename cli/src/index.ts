import * as readline from 'readline';
import dotenv from 'dotenv';
import { CliClient } from './client.js';
import { handleSlashCommand } from './commands.js';
import { LlmSession } from './llm.js';
import { getLocalTools } from './tools/index.js';

dotenv.config();

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';

async function main() {
    const cli = new CliClient(MCP_URL);
    try {
        await cli.connect();
        // Only log connection in interactive mode or if verbose
        if (process.argv.length <= 2) {
             console.log(`Connected to Notention Agent at ${MCP_URL}`);
        }

        const toolsResult = await cli.listTools();
        const tools = toolsResult.tools;

        // Initialize session with all tools (Remote + Local factory)
        const localTools = getLocalTools(cli);
        const session = new LlmSession(cli, tools, localTools);

        // Check for command mode args
        const args = process.argv.slice(2);
        if (args.length > 0) {
            // Command Mode
            const input = args.join(' ');
            await session.handleInteraction(input);
            await cli.close();
            process.exit(0);
        } else {
            // Interactive Mode
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
        }

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
