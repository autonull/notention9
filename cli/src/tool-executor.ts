import { CliClient } from './client.js';
import { LocalTool } from './llm.js';
import { loadSimTools, loadCoreTools } from './server-connection.js';

export interface ToolExecutor {
    (name: string, args: any): Promise<any>;
}

export interface AggregatedTools {
    allTools: any[];
    localTools: LocalTool[];
    coreTools: any[];
    simTools: any[];
}

export function createToolExecutor(
    localTools: LocalTool[],
    simTools: any[],
    cli: CliClient,
    simCli: CliClient
): ToolExecutor {
    return async (name: string, args: any) => {
        const localTool = localTools.find(t => t.name === name);
        if (localTool) return await localTool.execute(args);

        const isSimTool = simTools.some((t: any) => t.name === name);
        if (isSimTool && simCli.connected) {
            return await simCli.callTool(name, args);
        }

        return await cli.callTool(name, args);
    };
}

export function aggregateTools(
    coreTools: any[],
    simTools: any[],
    localTools: LocalTool[]
): AggregatedTools {
    const allTools = [
        ...coreTools,
        ...simTools,
        ...localTools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
        }))
    ];

    return { allTools, localTools, coreTools, simTools };
}