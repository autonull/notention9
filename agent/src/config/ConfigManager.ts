import { z } from 'zod';

export interface AgentConfig {
    server: {
        port: number;
    };
    mcp: {
        serverName: string;
        version: string;
    };
    capabilities: {
        browser: boolean;
        files: boolean;
        api: boolean;
    };
    nostr: {
        relays: string[];
    };
}

export class ConfigManager {
    private static instance: ConfigManager;
    private config: AgentConfig;

    private constructor() {
        this.config = this.loadConfig();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public getConfig(): AgentConfig {
        return this.config;
    }

    private loadConfig(): AgentConfig {
        // Load from environment variables or defaults
        return {
            server: {
                port: Number(process.env.PORT) || 3000
            },
            mcp: {
                serverName: process.env.MCP_SERVER_NAME || 'notention-agent',
                version: process.env.MCP_SERVER_VERSION || '1.0.0'
            },
            capabilities: {
                browser: process.env.ENABLE_BROWSER === 'true' || true,
                files: process.env.ENABLE_FILES === 'true' || true,
                api: process.env.ENABLE_API === 'true' || true
            },
            nostr: {
                relays: process.env.NOSTR_RELAYS ? process.env.NOSTR_RELAYS.split(',') : ['wss://relay.damus.io']
            }
        };
    }
}
