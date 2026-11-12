import { NetworkTransport } from '../types.js';
import { Logger } from '../../utils/logging.js';

const logger = Logger.create('WebBluetoothTransport');

interface BluetoothDevice {
    gatt: BluetoothRemoteGATTServer | null;
    addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
}

interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
    writeValue(buffer: ArrayBuffer): Promise<void>;
    startNotifications(): Promise<void>;
    stopNotifications(): Promise<void>;
    addEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void;
    removeEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void;
    value: DataView | null;
}

interface NavigatorWithBluetooth extends Navigator {
    bluetooth: {
        requestDevice(options: { filters: any[]; optionalServices: string[] }): Promise<BluetoothDevice>;
    };
}

export interface WebBluetoothTransportConfig {
    serviceUuid?: string;
    writeCharacteristicUuid?: string;
    notifyCharacteristicUuid?: string;
    filters?: { services: string[]; name?: string; namePrefix?: string }[];
}

export class WebBluetoothTransport implements NetworkTransport {
    private device: BluetoothDevice | null = null;
    private gattServer: BluetoothRemoteGATTServer | null = null;
    private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
    private notifyCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
    private dataCallback: ((data: Uint8Array, from: string) => void) | null = null;
    private config: Required<WebBluetoothTransportConfig>;
    private buffer = new Uint8Array(0);

    constructor(config: WebBluetoothTransportConfig = {}) {
        const serviceUuid = config.serviceUuid ?? '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
        this.config = {
            serviceUuid,
            writeCharacteristicUuid: config.writeCharacteristicUuid ?? '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
            notifyCharacteristicUuid: config.notifyCharacteristicUuid ?? '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
            filters: config.filters ?? [{ services: [serviceUuid] }],
        };
    }

    static isSupported(): boolean {
        return typeof navigator !== 'undefined' && 'bluetooth' in (navigator as NavigatorWithBluetooth);
    }

    async connect(): Promise<void> {
        if (!WebBluetoothTransport.isSupported()) {
            throw new Error('Web Bluetooth API not supported in this environment');
        }

        if (this.device?.gatt?.connected) {
            throw new Error('Already connected');
        }

        try {
            const nav = navigator as NavigatorWithBluetooth;
            this.device = await nav.bluetooth.requestDevice({
                filters: this.config.filters,
                optionalServices: [this.config.serviceUuid],
            });

            this.device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

            const gatt = await this.device.gatt?.connect();
            if (!gatt) {
                throw new Error('Failed to connect to GATT server');
            }
            this.gattServer = gatt;

            const service = await this.gattServer.getPrimaryService(this.config.serviceUuid);
            this.writeCharacteristic = await service.getCharacteristic(this.config.writeCharacteristicUuid);
            this.notifyCharacteristic = await service.getCharacteristic(this.config.notifyCharacteristicUuid);

            await this.notifyCharacteristic.startNotifications();
            this.notifyCharacteristic.addEventListener('characteristicvaluechanged', this.handleNotification.bind(this));

            logger.info('WebBluetooth transport connected');
        } catch (e) {
            logger.error('Failed to connect WebBluetooth transport', e as Error);
            await this.cleanup();
            throw e;
        }
    }

    private handleNotification(event: Event): void {
        const target = event.target as EventTarget & { value?: DataView };
        if (target.value && this.dataCallback) {
            this.handleData(new Uint8Array(target.value.buffer, target.value.byteOffset, target.value.byteLength));
        }
    }

    private handleData(chunk: Uint8Array): void {
        const newBuffer = new Uint8Array(this.buffer.length + chunk.length);
        newBuffer.set(this.buffer);
        newBuffer.set(chunk, this.buffer.length);
        this.buffer = newBuffer;

        while (this.buffer.length > 0) {
            const packet = this.parsePacket(this.buffer);
            if (!packet) break;

            this.buffer = this.buffer.slice(packet.consumed);
            if (packet.data && this.dataCallback) {
                this.dataCallback(packet.data, packet.from);
            }
        }
    }

    private parsePacket(buffer: Uint8Array): { consumed: number; data?: Uint8Array; from: string } | null {
        if (buffer.length < 2) return null;

        const length = buffer[0] | (buffer[1] << 8);
        if (buffer.length < 2 + length) return null;

        const data = buffer.slice(2, 2 + length);
        return { consumed: 2 + length, data, from: 'meshtastic' };
    }

    async send(data: Uint8Array): Promise<void> {
        if (!this.writeCharacteristic) {
            throw new Error('Not connected');
        }

        const length = data.length;
        const packet = new Uint8Array(2 + length);
        packet[0] = length & 0xff;
        packet[1] = (length >> 8) & 0xff;
        packet.set(data, 2);

        await this.writeCharacteristic.writeValue(packet.buffer);
    }

    onData(callback: (data: Uint8Array, from: string) => void): void {
        this.dataCallback = callback;
    }

    async disconnect(): Promise<void> {
        await this.cleanup();
    }

    private handleDisconnect(): void {
        logger.info('WebBluetooth device disconnected');
        this.cleanup().catch(e => logger.error('Cleanup error after disconnect', e as Error));
    }

    private async cleanup(): Promise<void> {
        if (this.notifyCharacteristic) {
            try {
                await this.notifyCharacteristic.stopNotifications();
                this.notifyCharacteristic.removeEventListener('characteristicvaluechanged', this.handleNotification.bind(this));
            } catch {
                // Ignore
            }
            this.notifyCharacteristic = null;
        }
        if (this.gattServer?.connected) {
            try {
                this.gattServer.disconnect();
            } catch {
                // Ignore
            }
        }
        this.gattServer = null;
        this.device = null;
        this.writeCharacteristic = null;
        logger.info('WebBluetooth transport disconnected');
    }

    getStatus(): { connected: boolean } {
        return { connected: !!this.device?.gatt?.connected };
    }
}

export function createWebBluetoothTransport(config?: WebBluetoothTransportConfig): WebBluetoothTransport {
    return new WebBluetoothTransport(config);
}