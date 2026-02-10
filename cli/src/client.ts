import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
// @ts-ignore
import EventSource from "eventsource";

// Handle both CommonJS and ESM interop
const EventSourceClass = EventSource.EventSource || EventSource;

// Polyfill EventSource if needed
if (!(global as any).EventSource) {
    (global as any).EventSource = EventSourceClass;
}

export class CliClient {
    private client: Client;
    private transport: SSEClientTransport;
    private url: string;
    public connected: boolean = false;

    constructor(url: string) {
        this.url = url;
        this.transport = new SSEClientTransport(new URL(url));
        this.client = new Client({
            name: "notention-cli",
            version: "1.0.0",
        }, {
            capabilities: {}
        });
    }

    async connect() {
        try {
            await this.client.connect(this.transport);
            this.connected = true;
        } catch (e: any) {
            this.connected = false;
            if (e.message && (e.message.includes('ECONNREFUSED') || e.message.includes('fetch failed'))) {
                console.error("\n\x1b[31mError: Could not connect to Notention Agent.\x1b[0m");
                console.error("\x1b[33mTip: Make sure the agent server is running.\x1b[0m");
                console.error("Run \x1b[36mnpm run dev:server\x1b[0m in a separate terminal.\n");
            }
            throw e;
        }
    }

    async listTools() {
        if (!this.connected) return { tools: [] };
        return await this.client.listTools();
    }

    async callTool(name: string, args: any) {
        if (!this.connected) throw new Error("Client not connected");
        return await this.client.callTool({
            name,
            arguments: args
        });
    }

    async close() {
        if (this.connected) {
            await this.client.close();
        }
    }
}
