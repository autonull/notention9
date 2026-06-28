import fs from 'fs';
import { join } from 'path';

export interface AgentConfig {
    agent: {
        enabled: boolean;
        model: string;
        serverPort: number;
        memoryUrl: string;
        logLevel: string;
        features: {
            memory: boolean;
            rag: boolean;
            mcp: boolean;
            workflows: boolean;
            voice: boolean;
        };
    };
    // Future: moltbot config
}

export async function loadAgentConfig(): Promise<AgentConfig> {
    const configPath = join(process.cwd(), 'config/agents.json');

    if (fs.existsSync(configPath)) {
        const raw = await fs.promises.readFile(configPath, 'utf-8');
        return JSON.parse(raw);
    }

    // Default configuration
    return {
        agent: {
            enabled: true,
            model: 'gpt-4o-mini',
            serverPort: 3141,
            memoryUrl: 'file:./.notention/agent_memory.db',
            logLevel: 'info',
            features: {
                memory: true,
                rag: true,
                mcp: true,
                workflows: true,
                voice: false
            }
        }
    };
}
