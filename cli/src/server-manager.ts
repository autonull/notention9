import net from 'net';
import { AgentServer } from '@notention/agent';
import { log, withSpinner } from './utils.js';

export class ServerManager {
    private server: AgentServer | null = null;

    async ensureServer(preferredUrl: string): Promise<{ url: string, started: boolean }> {
        // Parse port from URL
        let url: URL;
        try {
            url = new URL(preferredUrl);
        } catch (e) {
            // If invalid URL, default to localhost:3000
            url = new URL('http://localhost:3000/mcp/sse');
        }

        const port = parseInt(url.port) || 3000;
        const host = url.hostname || 'localhost';

        // Check if server is running
        const isRunning = await this.checkPort(port, host);

        if (isRunning) {
            log.info(`Connected to existing server at ${preferredUrl}`);
            return { url: preferredUrl, started: false };
        }

        log.info(`No server found at ${host}:${port}. Starting embedded server...`);

        // Start embedded server
        this.server = new AgentServer();

        // Start on random port (0)
        await withSpinner('Starting embedded Agent Server...', async () => {
             // Pass 0 to let the system pick a random port
             await this.server!.start(0);
        });

        const newPort = this.server.getPort();

        // Update URL with new port
        url.port = newPort.toString();
        const newUrl = url.toString();

        log.success(`Embedded server started at ${newUrl}`);

        return { url: newUrl, started: true };
    }

    private checkPort(port: number, host: string): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1000);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            socket.on('error', () => {
                resolve(false);
            });
            socket.connect(port, host);
        });
    }

    async stop() {
        if (this.server) {
            log.info('Stopping embedded server...');
            await this.server.stop();
            this.server = null;
        }
    }
}
