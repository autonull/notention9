import * as readline from 'readline';
import dotenv from 'dotenv';
import { CliClient } from './client.js';
import { handleSlashCommand } from './commands.js';
import { LlmSession, LLMConfig } from './llm.js';
import { getLocalTools } from './tools/index.js';
import { log, withSpinner } from './utils.js';
import { runSetupWizard } from './setup.js';

dotenv.config();

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';
const SIM_MCP_URL = process.env.SIM_MCP_URL || 'http://localhost:3000/mcp/simulation/sse';

function parseArgs(args: string[]): { enableSim: boolean, llmConfig: Partial<LLMConfig>, command?: string } {
    const result: { enableSim: boolean, llmConfig: Partial<LLMConfig>, command?: string } = {
        enableSim: false,
        llmConfig: {}
    };

    const remainingArgs: string[] = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--sim' || arg === '--simulation') {
            result.enableSim = true;
        } else if (arg === '--provider') {
            result.llmConfig.provider = args[++i];
        } else if (arg === '--model') {
            result.llmConfig.model = args[++i];
        } else if (arg === '--url') {
            result.llmConfig.baseURL = args[++i];
        } else if (arg === '--key' || arg === '--api-key') {
            result.llmConfig.apiKey = args[++i];
        } else {
            remainingArgs.push(arg);
        }
    }

    if (remainingArgs.length > 0) {
        result.command = remainingArgs.join(' ');
    }

    return result;
}

async function main() {
    const args = process.argv.slice(2);
    const { enableSim, llmConfig, command } = parseArgs(args);

    const cli = new CliClient(MCP_URL);
    const simCli = new CliClient(SIM_MCP_URL);
    const interactive = !command;

    try {
        if (interactive) log.info("Connecting to Notention Agent...");
        await cli.connect();
        if (interactive) log.success(`Connected to Notention Agent at ${MCP_URL}`);

        // Check for onboarding
        if (interactive) {
            try {
                const result: any = await cli.callTool('read_notes', { tags: ['@onboarding:setup'] });
                if (result && result.content && result.content[0] && result.content[0].text) {
                     const notes = JSON.parse(result.content[0].text);
                     if (Array.isArray(notes) && notes.length > 0) {
                         log.info("🚀 New installation detected! Starting setup wizard...");
                         await runSetupWizard(cli);
                     }
                }
            } catch (e) {
                // Ignore error if checking fails, proceed to normal start
            }
        }

        let simTools: any[] = [];

        if (enableSim) {
            try {
                if (interactive) log.info("Connecting to Simulation Agent...");
                await simCli.connect();
                const simToolsResult = await simCli.listTools();
                simTools = simToolsResult.tools;
                if (interactive) log.success(`Connected to Simulation Agent at ${SIM_MCP_URL}`);
            } catch (e) {
                if (interactive) log.warn(`Simulation Agent unavailable (skipping)`);
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
            const localTool = localTools.find(t => t.name === name);
            if (localTool) return await localTool.execute(args);

            const isSimTool = simTools.some((t: any) => t.name === name);
            if (isSimTool && simCli.connected) {
                return await simCli.callTool(name, args);
            }

            return await cli.callTool(name, args);
        };

        const session = new LlmSession(allTools, toolExecutor, llmConfig);

        if (command) {
            await session.handleInteraction(command);
            await cli.close();
            await simCli.close();
            process.exit(0);
        } else {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            console.log("\n" + "=".repeat(50));
            log.info("Welcome to Notention CLI");
            if (llmConfig.model) log.info(`Model: ${llmConfig.model}`);
            if (enableSim) log.info("Simulation Mode: ENABLED");
            console.log("Type /help for commands, or just chat with the agent.");
            console.log("=".repeat(50) + "\n");

            const ask = () => {
                rl.question('> ', async (rawInput) => {
                    const input = rawInput.trim();

                    if (!input) {
                        ask();
                        return;
                    }

                    if (input.startsWith('/')) {
                        await handleSlashCommand(input, cli, coreTools, session);
                    } else {
                        await session.handleInteraction(input);
                    }

                    ask();
                });
            };

            ask();
        }

    } catch (e) {
        log.error("Failed to connect", e);
        process.exit(1);
    }
}

// Check if running directly
// @ts-ignore
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
