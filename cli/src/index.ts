import * as readline from 'readline';
import dotenv from 'dotenv';
import { CliClient } from './client.js';
import { handleSlashCommand } from './commands.js';
import { LlmSession, LocalTool } from './llm.js';
import { getLocalTools } from './tools/index.js';

dotenv.config();

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';
const SIM_MCP_URL = process.env.SIM_MCP_URL || 'http://localhost:3000/mcp/simulation/sse';

async function main() {
    const cli = new CliClient(MCP_URL);
    const simCli = new CliClient(SIM_MCP_URL);

    try {
        await cli.connect();
        if (process.argv.length <= 2) {
             console.log(`Connected to Notention Agent at ${MCP_URL}`);
        }

        let simTools: any[] = [];
        try {
            await simCli.connect();
            const simToolsResult = await simCli.listTools();
            simTools = simToolsResult.tools;
            if (process.argv.length <= 2) {
                console.log(`Connected to Simulation Agent at ${SIM_MCP_URL}`);
            }
        } catch (e) {
            // Simulation server might not be running or reachable, which is fine
            if (process.argv.length <= 2) {
                console.log(`Simulation Agent unavailable (skipping)`);
            }
        }

        const toolsResult = await cli.listTools();
        const coreTools = toolsResult.tools;

        // Initialize local tools
        const localTools = getLocalTools(cli);

        // Aggregate Tools
        const allTools = [
            ...coreTools,
            ...simTools,
            ...localTools.map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema
            }))
        ];

        // Create Tool Executor Strategy
        const toolExecutor = async (name: string, args: any) => {
            // Check Local
            const localTool = localTools.find(t => t.name === name);
            if (localTool) return await localTool.execute(args);

            // Check Sim
            const isSimTool = simTools.some((t: any) => t.name === name);
            if (isSimTool && simCli.connected) {
                return await simCli.callTool(name, args);
            }

            // Default to Core
            return await cli.callTool(name, args);
        };

        const session = new LlmSession(allTools, toolExecutor);

        // Check for command mode args
        const args = process.argv.slice(2);
        if (args.length > 0) {
            // Command Mode
            const input = args.join(' ');
            await session.handleInteraction(input);
            await cli.close();
            await simCli.close();
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
                        // For slash commands, we currently only use core CLI tools
                        // We might need to refactor handleSlashCommand to use toolExecutor if needed
                        await handleSlashCommand(input, cli, coreTools);
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
