import { WebSocketServer, WebSocket } from 'ws';
import { MeshDevice } from '@meshtastic/core';
import { TransportNodeSerial } from '@meshtastic/transport-node-serial';
import { log, error } from '../core/utils.js';

const logger = { info: (msg: string, meta?: any) => log('MeshBridge', msg, meta), error: (msg: string, meta?: any) => error('MeshBridge', msg, meta), warn: (msg: string, meta?: any) => log('MeshBridge', `WARN: ${msg}`, meta) };

export interface MeshBridgeConfig {
    port: string;
    wsPort: number;
    wsHost?: string;
    baudRate?: number;
}

interface ClientConnection {
    ws: WebSocket;
    id: string;
}

export class MeshBridge {
    private device: MeshDevice | null = null;
    private wss: WebSocketServer | null = null;
    private clients = new Map<string, ClientConnection>();
    private config: Required<MeshBridgeConfig>;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private clientIdCounter = 0;
    private messageIdCounter = 0;

    constructor(config: MeshBridgeConfig) {
        this.config = {
            port: config.port,
            wsPort: config.wsPort,
            wsHost: config.wsHost ?? '127.0.0.1',
            baudRate: config.baudRate ?? 921600,
        };
    }

    async start(): Promise<void> {
        await this.startWebSocketServer();
        await this.connectMeshtastic();
        logger.info(`Mesh bridge started: Meshtastic on ${this.config.port}, WebSocket on ${this.config.wsHost}:${this.config.wsPort}`);
    }

    private async startWebSocketServer(): Promise<void> {
        this.wss = new WebSocketServer({
            port: this.config.wsPort,
            host: this.config.wsHost,
        });

        this.wss.on('connection', (ws: WebSocket) => {
            const clientId = `client_${++this.clientIdCounter}`;
            this.clients.set(clientId, { ws, id: clientId });
            logger.info(`Client connected: ${clientId} (total: ${this.clients.size})`);

            ws.on('message', (data: Buffer) => this.handleClientMessage(clientId, data));
            ws.on('close', () => this.handleClientDisconnect(clientId));
            ws.on('error', (err) => logger.error(`Client ${clientId} error`, err));

            this.sendToClient(clientId, { type: 'connected', clientId });
        });

        this.wss.on('error', (err) => logger.error('WebSocket server error', err));
    }

    private async connectMeshtastic(): Promise<void> {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        try {
            logger.info(`Connecting to Meshtastic on ${this.config.port}...`);
            const transport = await TransportNodeSerial.create(this.config.port);
            this.device = new MeshDevice(transport);

            (transport as any).onClose(() => {
                logger.warn('Meshtastic transport closed');
                this.handleMeshtasticDisconnect();
            });

            (this.device as any).onTextPacket((packet: any) => {
                if (packet.data?.data) {
                    this.broadcastToClients({
                        type: 'packet',
                        packetType: 'text',
                        data: Array.from(packet.data.data),
                        from: packet.from.toString(),
                        to: packet.to.toString(),
                        channel: packet.channel,
                    });
                }
            });

            (this.device as any).onDataPacket((packet: any) => {
                if (packet.data?.data) {
                    this.broadcastToClients({
                        type: 'packet',
                        packetType: 'data',
                        data: Array.from(packet.data.data),
                        from: packet.from.toString(),
                        to: packet.to.toString(),
                        channel: packet.channel,
                        portnum: packet.data.portnum,
                    });
                }
            });

            (this.device as any).onTelemetryPacket(async (packet: any) => {
                this.broadcastToClients({
                    type: 'packet',
                    packetType: 'telemetry',
                    from: packet.from.toString(),
                    telemetry: packet.data,
                });
            });

            (this.device as any).onPositionPacket(async (packet: any) => {
                this.broadcastToClients({
                    type: 'packet',
                    packetType: 'position',
                    from: packet.from.toString(),
                    position: packet.data,
                });
            });

            (this.device as any).onNodeInfoPacket(async (packet: any) => {
                this.broadcastToClients({
                    type: 'packet',
                    packetType: 'nodeinfo',
                    from: packet.from.toString(),
                    nodeInfo: packet.data,
                });
            });

            logger.info('Connected to Meshtastic device');
        } catch (e) {
            logger.error('Failed to connect to Meshtastic', e as Error);
            this.scheduleReconnect();
        }
    }

    private handleMeshtasticDisconnect(): void {
        this.device = null;
        this.broadcastToClients({ type: 'meshtastic_disconnected' });
        this.scheduleReconnect();
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimeout) return;
        logger.info('Scheduling Meshtastic reconnect in 5s...');
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connectMeshtastic().catch(() => {});
        }, 5000);
    }

    private handleClientMessage(clientId: string, data: Buffer): void {
        try {
            const message = JSON.parse(data.toString());
            switch (message.type) {
                case 'send_packet':
                    this.sendPacketToMesh(message);
                    break;
                case 'request_nodes':
                    this.sendNodeList(clientId);
                    break;
                case 'ping':
                    this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
                    break;
            }
        } catch (e) {
            logger.error(`Invalid message from ${clientId}`, e as Error);
        }
    }

    private sendPacketToMesh(message: any): void {
        if (!this.device) {
            logger.warn('Cannot send packet: Meshtastic not connected');
            return;
        }

        try {
            const data = new Uint8Array(message.data);
            const destination = message.destination ?? 0xFFFFFFFF;
            const portnum = message.portnum ?? 120;
            const channel = message.channel ?? 0;

            (this.device as any).sendPacket({
                data: { data, portnum },
                destination,
                channel,
            });
        } catch (e) {
            logger.error('Failed to send packet to mesh', e as Error);
        }
    }

    private sendNodeList(clientId: string): void {
        if (!this.device) return;
        const nodes = (this.device as any).nodes ?? {};
        const nodeList = Object.entries(nodes).map(([id, node]: [string, any]) => ({
            id,
            user: node.user,
            position: node.position,
            snr: node.snr,
            lastHeard: node.lastHeard,
        }));
        this.sendToClient(clientId, { type: 'node_list', nodes: nodeList });
    }

    private handleClientDisconnect(clientId: string): void {
        this.clients.delete(clientId);
        logger.info(`Client disconnected: ${clientId} (remaining: ${this.clients.size})`);
    }

    private sendToClient(clientId: string, message: any): void {
        const client = this.clients.get(clientId);
        if (client?.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }

    private broadcastToClients(message: any): void {
        const data = JSON.stringify(message);
        for (const [id, client] of this.clients) {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(data);
            }
        }
    }

    async stop(): Promise<void> {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.device) {
            try {
                await (this.device as any).transport?.close();
            } catch {
                // Ignore
            }
            this.device = null;
        }

        for (const [, client] of this.clients) {
            client.ws.close(1001, 'Bridge shutting down');
        }
        this.clients.clear();

        if (this.wss) {
            await new Promise<void>(resolve => this.wss!.close(() => resolve()));
            this.wss = null;
        }

        logger.info('Mesh bridge stopped');
    }

    getStatus() {
        return {
            meshtasticConnected: !!this.device,
            wsClients: this.clients.size,
            wsPort: this.config.wsPort,
        };
    }
}

export function createMeshBridge(config: MeshBridgeConfig): MeshBridge {
    return new MeshBridge(config);
}