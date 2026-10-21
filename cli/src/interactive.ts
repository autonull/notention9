import dotenv from 'dotenv';
import { CliClient } from './client.js';
import { commandRegistry, handleSlashCommand } from './commands/index.js';
import { configManager } from './config-manager.js';
import { ServerManager } from './server-manager.js';
import { getLocalTools } from './tools/index.js';
import { log } from './utils.js';
import { connectToServers, connectCliClient, loadSimTools, loadCoreTools } from './server-connection.js';
import { aggregateTools } from './tool-executor.js';
import { initializeSession } from './session-init.js';
import { createCompleter, createReadlineInterface, runRepl } from './repl.js';
import type { LLMProviderConfig, AppConfig } from './config-manager.js';

dotenv.config();

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';
const SIM_MCP_URL = process.env.SIM_MCP_URL || 'http://localhost:3000/mcp/simulation/sse';

// Main function that can accept options from the CLI commander
export async function startInteractiveSession(options: {
    provider?: string;
    model?: string;
    url?: string;
    key?: string;
    temperature?: number;
    maxTokens?: number;
    sim?: boolean;
    simulation?: boolean;
    command?: string;
    verbose?: boolean;
} = {}) {
    const command = options.command;
    const interactive = !command;
    const enableSim = Boolean(options.sim || options.simulation);

    // Connect to servers
    const { mcpUrl, simMcpUrl, serverManager } = await connectToServers(interactive);

    const cli = await connectCliClient(mcpUrl, interactive, 'Notention Agent');
    const simCli = await connectCliClient(simMcpUrl, false, 'Simulation Agent');

    const cleanup = async () => {
        await serverManager.stop();
        await cli.close();
        await simCli.close();
    };

    try {
        // Load tools
        const coreTools = await loadCoreTools(cli);
        const localTools = getLocalTools(cli);
        const simTools = enableSim ? await loadSimTools(simCli, interactive) : [];

        const aggregatedTools = aggregateTools(coreTools, simTools, localTools);

        // Initialize session
        const { session, config, coreTools: sessionCoreTools } = await initializeSession(
            options,
            aggregatedTools,
            cli,
            simCli
        );

        if (command) {
            if (command.startsWith('/')) {
                if (command === '/status') {
                    const statusCmd = commandRegistry.get('/status');
                    if (statusCmd) {
                        await statusCmd.execute([], { cli, tools: sessionCoreTools, session });
                    }
                } else {
                    await handleSlashCommand(command, cli, sessionCoreTools, session);
                }
            } else {
                await session.handleInteraction(command);
            }
            await cleanup();
            process.exit(0);
        } else {
            // Setup REPL
            const completer = createCompleter();
            const rl = createReadlineInterface(completer);

            await runRepl(rl, session, cli, sessionCoreTools, enableSim, config, cleanup);
        }

    } catch (e) {
        log.error("Failed to connect", e);
        await cleanup();
        process.exit(1);
    }
}