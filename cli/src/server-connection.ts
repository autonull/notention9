import { CliClient } from './client.js';
import { ServerManager } from './server-manager.js';
import { log, withSpinner } from './utils.js';

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';
const SIM_MCP_URL = process.env.SIM_MCP_URL || 'http://localhost:3000/mcp/simulation/sse';

export interface ServerConnectionResult {
    mcpUrl: string;
    simMcpUrl: string;
    serverManager: ServerManager;
}

export async function connectToServers(interactive: boolean): Promise<ServerConnectionResult> {
    const serverManager = new ServerManager();
    let mcpUrl = MCP_URL;
    let simMcpUrl = SIM_MCP_URL;

    try {
        if (interactive) log.info("Checking server status...");
        const serverInfo = await serverManager.ensureServer(mcpUrl);
        if (serverInfo.started) {
            mcpUrl = serverInfo.url;

            // Update SIM URL to match new port
            try {
                const mcpUrlObj = new URL(mcpUrl);
                const simUrlObj = new URL(simMcpUrl);
                simUrlObj.port = mcpUrlObj.port;
                simMcpUrl = simUrlObj.toString();
            } catch (e) {
                // Ignore URL parsing errors
            }
        }
    } catch (e) {
        log.error("Failed to ensure server is running", e);
        process.exit(1);
    }

    return { mcpUrl, simMcpUrl, serverManager };
}

export async function connectCliClient(url: string, interactive: boolean, label: string): Promise<CliClient> {
    const cli = new CliClient(url);
    let connected = false;
    let retries = 3;

    while (!connected && retries > 0) {
        try {
            await cli.connect();
            connected = true;
            if (interactive) log.success(`Connected to ${label} at ${url}`);
        } catch (e) {
            retries--;
            if (retries > 0) {
                if (interactive) log.warn(`Connection failed, retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                throw new Error(`Failed to connect to ${label} after 3 attempts: ${e}`);
            }
        }
    }

    return cli;
}

export async function loadSimTools(simCli: CliClient, interactive: boolean): Promise<any[]> {
    if (!simCli.connected) return [];

    try {
        const simToolsResult = await withSpinner('Loading simulation tools...', () => simCli.listTools());
        if (interactive) log.success(`Loaded ${simToolsResult.tools.length} simulation tools`);
        return simToolsResult.tools;
    } catch (e) {
        if (interactive) log.warn(`Simulation Agent unavailable (skipping)`);
        return [];
    }
}

export async function loadCoreTools(cli: CliClient): Promise<any[]> {
    const toolsResult = await cli.listTools();
    return toolsResult.tools;
}