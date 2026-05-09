import { MeshDevice } from "@meshtastic/core";
import { TransportNodeSerial } from "@meshtastic/transport-node-serial";
import { MeshtasticNetworkProvider, Note } from "@notention/core";
import { log, error } from "../core/utils.js";

export class MeshtasticAgentManager {
    private device: MeshDevice | null = null;
    private provider: MeshtasticNetworkProvider;

    constructor(private onNewNote: (note: Note) => void) {
        this.provider = new MeshtasticNetworkProvider({ enabled: true });
        this.provider.subscribe(this.onNewNote);
    }

    async connect(port: string): Promise<void> {
        try {
            log('Mesh', `Connecting to Meshtastic device on ${port}...`);
            const transport = await TransportNodeSerial.create(port);
            this.device = new MeshDevice(transport);

            this.device.onTextPacket((packet) => {
                log('Mesh', `Received text packet from ${packet.from}`);
                if (packet.data.data) {
                    this.provider.handleIncomingPacket(packet.data.data as Uint8Array, packet.from.toString());
                }
            });

            this.device.onTelemetryPacket((packet) => {
                log('Mesh', `Received telemetry from ${packet.from}`);
                const note = this.provider.mapTelemetryToNote(packet.from.toString(), packet.data);
                this.onNewNote(note);
            });

            this.device.onPositionPacket((packet) => {
                log('Mesh', `Received position from ${packet.from}`);
                const note = this.provider.mapPositionToNote(packet.from.toString(), packet.data);
                this.onNewNote(note);
            });

            log('Mesh', 'Connected to Meshtastic device');
        } catch (e) {
            error('Mesh', 'Failed to connect to Meshtastic device', e as Error);
            throw e;
        }
    }

    async sendNote(note: Note): Promise<void> {
        if (!this.device) {
            error('Mesh', 'Cannot send note: No device connected');
            return;
        }
        log('Mesh', `Sending note ${note.id} to mesh...`);
    }

    getStatus() {
        return {
            connected: !!this.device,
        };
    }
}
