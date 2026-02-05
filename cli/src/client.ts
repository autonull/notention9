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
        await this.client.connect(this.transport);
    }

    async listTools() {
        return await this.client.listTools();
    }

    async callTool(name: string, args: any) {
        return await this.client.callTool({
            name,
            arguments: args
        });
    }

    async close() {
        await this.client.close();
    }
}
