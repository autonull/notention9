import { MeshDevice } from "@meshtastic/core";
import { TransportNodeSerial } from "@meshtastic/transport-node-serial";
import { MeshtasticNetworkProvider, Note } from "@notention/core";
import { log, error } from "../core/utils.js";
import { PersistenceService } from "../persistence.js";

export class MeshtasticAgentManager {
    private device: MeshDevice | null = null;
    private provider: MeshtasticNetworkProvider;
    private lastPort: string | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(private onNewNote: (note: Note) => void) {
        this.provider = new MeshtasticNetworkProvider({ enabled: true });
        this.provider.on('note', async (note: Note) => {
            if (this.provider.config.saveReceivedNotes) {
                await PersistenceService.saveNoteSafe(note);
            }
            this.onNewNote(note);
        });
    }

    async connect(port: string): Promise<void> {
        this.lastPort = port;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        try {
            log('Mesh', `Connecting to Meshtastic device on ${port}...`);
            const transport = await TransportNodeSerial.create(port);
            this.device = new MeshDevice(transport);

            // Handle disconnection
             (transport as any).onClose(() => {
                log('Mesh', 'Meshtastic transport closed');
                this.handleDisconnect();
            });

            // Register transport with provider
            this.provider.setTransport({
                send: async (data) => {
                    if (!this.device) throw new Error("No device connected");
                    await  (this.device as any).sendPacket({
                        data: { data, portnum: 120 },
                        destination: 0xFFFFFFFF
                    });
                },
                onData: (callback) => {
                     (this.device as any)?.onTextPacket((packet: any) => {
                        log('Mesh', `Received text packet from ${packet.from}`);
                        if (packet.data.data) {
                            callback(packet.data.data as Uint8Array, packet.from.toString());
                        }
                    });
                }
            });

             (this.device as any).onTelemetryPacket(async (packet: any) => {
                log('Mesh', `Received telemetry from ${packet.from}`);
                const nodeId = packet.from.toString();
                const existingNote = await PersistenceService.getNoteSafe(this.provider.getNodeNoteId(nodeId));
                const note = this.provider.mapTelemetryToNote(nodeId, packet.data, existingNote || undefined);
                await PersistenceService.saveNoteSafe(note);
                this.onNewNote(note);
            });

             (this.device as any).onPositionPacket(async (packet: any) => {
                log('Mesh', `Received position from ${packet.from}`);
                const nodeId = packet.from.toString();
                const existingNote = await PersistenceService.getNoteSafe(this.provider.getNodeNoteId(nodeId));
                const note = this.provider.mapPositionToNote(nodeId, packet.data, existingNote || undefined);
                await PersistenceService.saveNoteSafe(note);
                this.onNewNote(note);
            });

            log('Mesh', 'Connected to Meshtastic device');
        } catch (e) {
            error('Mesh', 'Failed to connect to Meshtastic device', e as Error);
            this.handleDisconnect();
            throw e;
        }
    }

    private handleDisconnect() {
        this.device = null;
        this.provider.setTransport(null);

        if (this.lastPort && !this.reconnectTimeout) {
            log('Mesh', `Scheduling reconnect to ${this.lastPort} in 5s...`);
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                if (this.lastPort) {
                    this.connect(this.lastPort).catch(() => {
                        // Silent fail on auto-reconnect
                    });
                }
            }, 5000);
        }
    }

    async sendNote(note: Note): Promise<void> {
        if (!this.device) {
            error('Mesh', 'Cannot send note: No device connected');
            return;
        }

        log('Mesh', `Sending note ${note.id} to mesh...`);

        try {
            await this.provider.sendNote(note);
            log('Mesh', 'Note packet sent to mesh');
        } catch (e) {
            error('Mesh', 'Failed to send note to mesh', e as Error);
            throw e;
        }
    }

    updateConfig(config: Partial<{ saveReceivedNotes: boolean }>) {
        if (config.saveReceivedNotes !== undefined) {
            this.provider.config.saveReceivedNotes = config.saveReceivedNotes;
        }
    }

    getStatus() {
        return {
            connected: !!this.device,
            config: {
                saveReceivedNotes: this.provider.config.saveReceivedNotes
            }
        };
    }
}
