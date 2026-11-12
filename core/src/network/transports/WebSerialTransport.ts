import { NetworkTransport } from '../types.js';
import { Logger } from '../../utils/logging.js';

const logger = Logger.create('WebSerialTransport');

interface SerialPort {
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
}

interface NavigatorWithSerial extends Navigator {
    serial: {
        requestPort(options: { filters: { usbVendorId: number; usbProductId: number }[] }): Promise<SerialPort>;
    };
}

export interface WebSerialTransportConfig {
    baudRate?: number;
    filters?: { usbVendorId: number; usbProductId: number }[];
}

export class WebSerialTransport implements NetworkTransport {
    private port: SerialPort | null = null;
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private dataCallback: ((data: Uint8Array, from: string) => void) | null = null;
    private config: Required<WebSerialTransportConfig>;
    private buffer = new Uint8Array(0);

    constructor(config: WebSerialTransportConfig = {}) {
        this.config = {
            baudRate: config.baudRate ?? 921600,
            filters: config.filters ?? [{ usbVendorId: 0x2341, usbProductId: 0x8053 }], // Default ESP32
        };
    }

    static isSupported(): boolean {
        return typeof navigator !== 'undefined' && 'serial' in (navigator as NavigatorWithSerial);
    }

    async connect(): Promise<void> {
        if (!WebSerialTransport.isSupported()) {
            throw new Error('Web Serial API not supported in this environment');
        }

        if (this.port) {
            throw new Error('Already connected');
        }

        try {
            const nav = navigator as NavigatorWithSerial;
            this.port = await nav.serial.requestPort({ filters: this.config.filters });
            await this.port.open({ baudRate: this.config.baudRate });

            this.reader = this.port.readable?.getReader() ?? null;
            if (!this.reader) {
                throw new Error('Failed to get reader from serial port');
            }

            this.startReading();
            logger.info('WebSerial transport connected');
        } catch (e) {
            logger.error('Failed to connect WebSerial transport', e as Error);
            await this.cleanup();
            throw e;
        }
    }

    private async startReading(): Promise<void> {
        if (!this.reader) return;

        try {
            while (true) {
                const { done, value } = await this.reader.read();
                if (done) break;
                if (value && this.dataCallback) {
                    this.handleData(value);
                }
            }
        } catch (e) {
            logger.error('WebSerial read error', e as Error);
        } finally {
            await this.cleanup();
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
        if (!this.port || !this.port.writable) {
            throw new Error('Not connected');
        }

        const writer = this.port.writable.getWriter();
        try {
            const length = data.length;
            const packet = new Uint8Array(2 + length);
            packet[0] = length & 0xff;
            packet[1] = (length >> 8) & 0xff;
            packet.set(data, 2);
            await writer.write(packet);
        } finally {
            writer.releaseLock();
        }
    }

    onData(callback: (data: Uint8Array, from: string) => void): void {
        this.dataCallback = callback;
    }

    async disconnect(): Promise<void> {
        await this.cleanup();
    }

    private async cleanup(): Promise<void> {
        if (this.reader) {
            try {
                await this.reader.cancel();
            } catch {
                // Ignore cancellation errors
            }
            this.reader = null;
        }
        if (this.port) {
            try {
                await this.port.close();
            } catch {
                // Ignore close errors
            }
            this.port = null;
        }
        logger.info('WebSerial transport disconnected');
    }

    getStatus(): { connected: boolean } {
        return { connected: !!this.port && !!this.reader };
    }
}

export function createWebSerialTransport(config?: WebSerialTransportConfig): WebSerialTransport {
    return new WebSerialTransport(config);
}