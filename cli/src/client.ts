import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
// @ts-ignore
import EventSource from "eventsource";
import { log } from "./utils.js";

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
            // Throw the error to let the caller handle retries/logging
            throw e;
        }
    }

    async listTools() {
        if (!this.connected) return { tools: [] };
        try {
            return await this.client.listTools();
        } catch (e: any) {
            log.error(`Failed to list tools`, e);
            return { tools: [] };
        }
    }

    async callTool(name: string, args: any) {
        if (!this.connected) throw new Error("Client not connected");

        try {
            const result = await this.client.callTool({
                name,
                arguments: args
            });
            return result;
        } catch (e: any) {
             throw new Error(`Tool '${name}' execution failed: ${e.message}`);
        }
    }

    async close() {
        if (this.connected) {
            try {
                await this.client.close();
            } catch (e) {
                // Ignore close errors
            }
            this.connected = false;
        }
    }
}
