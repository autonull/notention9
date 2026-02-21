import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { join } from 'path';
import fs from 'fs';
import { log, error } from './core/utils';
import { Bootstrap } from './Bootstrap';
import { SocketController } from './server/SocketController';
import { ConfigManager } from './config/ConfigManager';
import { setupMcpServer } from './server/McpServer';
import { setAgentRegistry } from './globals';
import { Server as HttpServer } from 'http';

export class AgentServer {
    private app: express.Express;
    private server: HttpServer | null = null;
    private wss: WebSocketServer | null = null;
    private socketController: SocketController | null = null;
    private port: number = 0;

    constructor() {
        this.app = express();
    }

    public getPort(): number {
        return this.port;
    }

    async start(port?: number) {
        const config = ConfigManager.getInstance().getConfig();
        const PORT = port !== undefined ? port : config.server.port;

        this.initExpress();
        await this.setupMcp();
        this.setupStaticServing();

        await this.startHttpServer(PORT);
        this.setupWebsocket();
        await this.initAgentSystem();
    }

    async stop() {
        log('System', 'Shutting down...');
        if (!this.server) return;

        return new Promise<void>((resolve, reject) => {
            this.server!.close((err) => err ? reject(err) : resolve());
        });
    }

    private initExpress() {
        this.app.use(express.json());
    }

    private startHttpServer(port: number): Promise<void> {
        return new Promise((resolve) => {
            this.server = this.app.listen(port, () => {
                const addr = this.server?.address();
                const realPort = typeof addr === 'object' && addr ? addr.port : port;
                this.port = realPort;
                log('Server', `Notention + VoltAgent running on http://localhost:${realPort}`);
                resolve();
            });
        });
    }

    private async setupMcp() {
        try {
            await setupMcpServer(this.app);
        } catch (e) {
            error('MCP', 'Failed to setup MCP servers', e);
            throw e;
        }
    }

    private setupStaticServing() {
        const potentialPaths = [
            join(process.cwd(), '../ui/dist'),
            join(process.cwd(), 'ui/dist')
        ];

        const path = potentialPaths.find(p => fs.existsSync(p));
        if (path) {
            this.app.use(express.static(path));
        }
    }

    private setupWebsocket() {
        if (!this.server) {
            error('WS', 'Server not initialized');
            return;
        }

        this.wss = new WebSocketServer({ server: this.server, path: '/ws/agent' });
        this.wss.on('connection', (ws) => this.handleClientConnection(ws));
    }

    private handleClientConnection(ws: WebSocket) {
        log('WS', 'UI client connected');

        if (this.socketController) {
            this.socketController.addClient(ws);
        } else {
            log('WS', 'Client connected before full init');
        }

        ws.send(JSON.stringify({
            type: 'connection_established',
            message: 'Connected to Notention Agent'
        }));

        ws.on('message', async (data) => {
            if (!this.socketController) {
                ws.send(JSON.stringify({ type: 'error', message: 'System initializing...' }));
                return;
            }

            try {
                const message = JSON.parse(data.toString());
                await this.socketController.handleMessage(message, ws);
            } catch (e) {
                error('WS', 'Message handling error', e);
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
            }
        });
    }

    private async initAgentSystem() {
        const bootstrap = new Bootstrap();

        // Initialize bootstrap asynchronously
        bootstrap.init((event) => {
            // Event callback from Bootstrap (e.g. from VoltAgent)
            if (this.socketController) {
                this.socketController.broadcast(event);
            }
        }).then((components) => {
            log('Init', 'Agent system initialized');
            setAgentRegistry(components.agentRegistry);

            this.socketController = new SocketController(
                components.agentRegistry,
                components.skillExecutor,
                components.feedbackCollector
            );

        }).catch(err => error('Init', 'Bootstrap failed', err));
    }
}
