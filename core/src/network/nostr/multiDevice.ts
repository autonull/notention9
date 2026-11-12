import { finalizeEvent, getPublicKey, getEventHash, verifyEvent } from 'nostr-tools/pure';
import { npubEncode, decode } from 'nostr-tools/nip19';
import { hexToBytes, bytesToHex } from '../../utils/encoding.js';
import { Logger } from '../../utils/logging.js';
import type { NostrEvent } from '../../types/index.js';
import { JsonStore } from '../../storage/Storage.js';
import { getIndexedDBAdapter } from '../../storage/indexedDB.js';

const logger = Logger.create('MultiDevice');

function npubDecode(npub: string): string | null {
    try {
        const result = decode(npub);
        if (result.type === 'npub') {
            return result.data as string;
        }
        return null;
    } catch {
        return null;
    }
}

export const KIND_DEVICE_LIST = 35010;
export const KIND_DEVICE_SESSION = 35011;
export const KIND_DEVICE_LINK = 35012;

export interface DeviceInfo {
    deviceId: string;
    name: string;
    platform: string;
    createdAt: number;
    lastSeen: number;
    pubkey: string;
    isCurrent: boolean;
    capabilities?: string[];
}

export interface DeviceListEvent {
    kind: typeof KIND_DEVICE_LIST;
    tags: string[][];
    content: string;
    created_at: number;
    pubkey: string;
    id: string;
    sig: string;
}

export interface DeviceSessionEvent {
    kind: typeof KIND_DEVICE_SESSION;
    tags: string[][];
    content: string;
    created_at: number;
    pubkey: string;
    id: string;
    sig: string;
}

export interface DeviceLinkPayload {
    npub: string;
    deviceId: string;
    deviceName: string;
    platform: string;
    relays: string[];
    expiresAt: number;
    version: number;
}

export interface LinkedDevice {
    deviceId: string;
    name: string;
    platform: string;
    linkedAt: number;
    lastSeen: number;
    relays: string[];
    isCurrent: boolean;
    sessionPubkey?: string;
}

export interface MultiDeviceConfig {
    storageKey?: string;
    deviceName?: string;
    platform?: string;
    defaultRelays?: string[];
    linkExpiryMs?: number;
}

interface StoredDeviceList {
    devices: LinkedDevice[];
    updatedAt: number;
}

function generateDeviceId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
}

function getCurrentPlatform(): string {
    if (typeof navigator !== 'undefined') {
        return navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop';
    }
    return 'node';
}

export function encodeDeviceLinkToString(link: DeviceLinkPayload): string {
    const json = JSON.stringify(link);
    const bytes = new TextEncoder().encode(json);
    return btoa(String.fromCharCode(...bytes));
}

export function decodeDeviceLinkFromString(str: string): DeviceLinkPayload | null {
    try {
        const bytes = Uint8Array.from(atob(str), c => c.charCodeAt(0));
        const json = new TextDecoder().decode(bytes);
        const link = JSON.parse(json);
        if (link.npub && link.deviceId && link.version === 1) {
            return link as DeviceLinkPayload;
        }
        return null;
    } catch {
        return null;
    }
}

export function createDeviceLink(
    npub: string,
    deviceId: string,
    deviceName: string,
    platform: string,
    relays: string[],
    expiryMs: number = 7 * 24 * 60 * 60 * 1000
): DeviceLinkPayload {
    return {
        npub,
        deviceId,
        deviceName,
        platform,
        relays,
        expiresAt: Date.now() + expiryMs,
        version: 1,
    };
}

export function createDeviceListEvent(
    devices: LinkedDevice[],
    privkey: string
): DeviceListEvent {
    const pubkey = getPublicKey(hexToBytes(privkey));
    const tags: string[][] = [
        ['d', `devices_${pubkey}`],
        ['t', 'device-list'],
    ];

    const content = JSON.stringify({ devices, updatedAt: Date.now() });

    const event: DeviceListEvent = {
        kind: KIND_DEVICE_LIST,
        tags,
        content,
        created_at: Math.floor(Date.now() / 1000),
        pubkey,
        id: '',
        sig: '',
    };

    event.id = getEventHash(event);
    const signed = finalizeEvent(event, hexToBytes(privkey));
    return signed as DeviceListEvent;
}

export function createDeviceSessionEvent(
    device: LinkedDevice,
    sessionPubkey: string,
    privkey: string
): DeviceSessionEvent {
    const pubkey = getPublicKey(hexToBytes(privkey));
    const tags: string[][] = [
        ['d', `session_${device.deviceId}_${pubkey}`],
        ['device', device.deviceId],
        ['session', sessionPubkey],
        ['name', device.name],
        ['platform', device.platform],
        ['t', 'device-session'],
    ];

    const content = JSON.stringify({
        deviceId: device.deviceId,
        sessionPubkey,
        relays: device.relays,
        createdAt: Date.now(),
    });

    const event: DeviceSessionEvent = {
        kind: KIND_DEVICE_SESSION,
        tags,
        content,
        created_at: Math.floor(Date.now() / 1000),
        pubkey,
        id: '',
        sig: '',
    };

    event.id = getEventHash(event);
    const signed = finalizeEvent(event, hexToBytes(privkey));
    return signed as DeviceSessionEvent;
}

export function verifyDeviceListEvent(event: NostrEvent): boolean {
    if (event.kind !== KIND_DEVICE_LIST) return false;
    if (!verifyEvent(event)) return false;
    const dTag = event.tags.find(t => t[0] === 'd');
    if (!dTag || !dTag[1].startsWith('devices_')) return false;
    return true;
}

export function verifyDeviceSessionEvent(event: NostrEvent): boolean {
    if (event.kind !== KIND_DEVICE_SESSION) return false;
    if (!verifyEvent(event)) return false;
    const dTag = event.tags.find(t => t[0] === 'd');
    if (!dTag || !dTag[1].startsWith('session_')) return false;
    return true;
}

export function extractDevicesFromEvent(event: NostrEvent): LinkedDevice[] | null {
    if (!verifyDeviceListEvent(event)) return null;
    try {
        const parsed = JSON.parse(event.content);
        if (Array.isArray(parsed.devices)) {
            return parsed.devices as LinkedDevice[];
        }
        return [];
    } catch {
        return null;
    }
}

export function extractSessionFromEvent(event: NostrEvent): { deviceId: string; sessionPubkey: string; relays: string[]; createdAt: number } | null {
    if (!verifyDeviceSessionEvent(event)) return null;
    try {
        const parsed = JSON.parse(event.content);
        if (parsed.deviceId && parsed.sessionPubkey) {
            return {
                deviceId: parsed.deviceId,
                sessionPubkey: parsed.sessionPubkey,
                relays: parsed.relays ?? [],
                createdAt: parsed.createdAt ?? 0,
            };
        }
        return null;
    } catch {
        return null;
    }
}

export class DeviceManager {
    private _deviceId: string;
    private _deviceName: string;
    private _platform: string;
    private _defaultRelays: string[];
    private _linkExpiryMs: number;
    private _store: JsonStore<StoredDeviceList>;
    private _devices: LinkedDevice[] = [];
    private _currentPrivkey: string | null = null;
    private _currentPubkey: string | null = null;
    private _sessionPubkey: string | null = null;
    private _callbacks: Set<(devices: LinkedDevice[]) => void> = new Set();

    constructor(config: MultiDeviceConfig = {}) {
        this._deviceId = generateDeviceId();
        this._deviceName = config.deviceName ?? `Device-${this._deviceId.slice(0, 6)}`;
        this._platform = config.platform ?? getCurrentPlatform();
        this._defaultRelays = config.defaultRelays ?? ['wss://relay.damus.io', 'wss://nos.lol'];
        this._linkExpiryMs = config.linkExpiryMs ?? 7 * 24 * 60 * 60 * 1000;

        const isBrowser = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
        const adapter = isBrowser ? getIndexedDBAdapter('notention', 'devices') : undefined;
        const storageKey = config.storageKey ?? 'notention-devices';
        this._store = new JsonStore<StoredDeviceList>(storageKey, adapter);
    }

    get deviceId(): string {
        return this._deviceId;
    }

    get deviceName(): string {
        return this._deviceName;
    }

    get platform(): string {
        return this._platform;
    }

    get defaultRelays(): string[] {
        return this._defaultRelays;
    }

    get devices(): LinkedDevice[] {
        return [...this._devices];
    }

    get linkedDevices(): LinkedDevice[] {
        return this._devices.filter(d => !d.isCurrent);
    }

    get currentDevice(): LinkedDevice | undefined {
        return this._devices.find(d => d.isCurrent);
    }

    setIdentity(privkey: string): void {
        this._currentPrivkey = privkey;
        this._currentPubkey = getPublicKey(hexToBytes(privkey));
    }

    setSessionPubkey(sessionPubkey: string): void {
        this._sessionPubkey = sessionPubkey;
    }

    async initialize(): Promise<void> {
        await this._store.load();
        const stored = this._store.get();
        if (stored?.devices) {
            this._devices = stored.devices;
        }

        if (this._currentPubkey) {
            await this.ensureCurrentDevice();
        }
    }

    private async ensureCurrentDevice(): Promise<void> {
        if (!this._currentPubkey) return;

        const existing = this._devices.find(d => d.isCurrent);
        if (!existing) {
            const currentDevice: LinkedDevice = {
                deviceId: this._deviceId,
                name: this._deviceName,
                platform: this._platform,
                linkedAt: Date.now(),
                lastSeen: Date.now(),
                relays: this._defaultRelays,
                isCurrent: true,
                sessionPubkey: this._sessionPubkey ?? undefined,
            };
            this._devices.push(currentDevice);
            await this.saveDevices();
        } else {
            existing.lastSeen = Date.now();
            existing.name = this._deviceName;
            existing.platform = this._platform;
            existing.relays = this._defaultRelays;
            existing.sessionPubkey = this._sessionPubkey ?? undefined;
            await this.saveDevices();
        }
    }

    private async saveDevices(): Promise<void> {
        const stored: StoredDeviceList = {
            devices: this._devices,
            updatedAt: Date.now(),
        };
        await this._store.save(stored);
        this.notifyCallbacks();
    }

    private notifyCallbacks(): void {
        for (const cb of this._callbacks) {
            try {
                cb([...this._devices]);
            } catch (e) {
                logger.error('Device callback error', e as Error);
            }
        }
    }

    onDevicesChange(callback: (devices: LinkedDevice[]) => void): () => void {
        this._callbacks.add(callback);
        return () => this._callbacks.delete(callback);
    }

    async createLink(npub?: string): Promise<DeviceLinkPayload> {
        if (!this._currentPubkey && !npub) {
            throw new Error('Identity not set. Call setIdentity() first or provide npub.');
        }
        const targetNpub = npub ?? npubEncode(this._currentPubkey!);
        return createDeviceLink(
            targetNpub,
            this._deviceId,
            this._deviceName,
            this._platform,
            this._defaultRelays,
            this._linkExpiryMs
        );
    }

    async createLinkString(npub?: string): Promise<string> {
        const link = await this.createLink(npub);
        return encodeDeviceLinkToString(link);
    }

    async parseLink(linkString: string): Promise<DeviceLinkPayload | null> {
        return decodeDeviceLinkFromString(linkString);
    }

    async linkDevice(linkString: string, targetPrivkey: string): Promise<LinkedDevice> {
        const link = await this.parseLink(linkString);
        if (!link) {
            throw new Error('Invalid device link');
        }

        if (link.expiresAt < Date.now()) {
            throw new Error('Device link has expired');
        }

        const targetPubkey = getPublicKey(hexToBytes(targetPrivkey));
        const linkPubkey = npubDecode(link.npub);
        if (!linkPubkey || linkPubkey !== targetPubkey) {
            throw new Error('Link does not match provided identity');
        }

        const existingIndex = this._devices.findIndex(d => d.deviceId === link.deviceId);
        const linkedDevice: LinkedDevice = {
            deviceId: link.deviceId,
            name: link.deviceName,
            platform: link.platform,
            linkedAt: Date.now(),
            lastSeen: Date.now(),
            relays: link.relays,
            isCurrent: false,
        };

        if (existingIndex >= 0) {
            this._devices[existingIndex] = { ...this._devices[existingIndex], ...linkedDevice };
        } else {
            this._devices.push(linkedDevice);
        }

        await this.saveDevices();
        return linkedDevice;
    }

    async revokeDevice(deviceId: string): Promise<void> {
        const index = this._devices.findIndex(d => d.deviceId === deviceId);
        if (index >= 0) {
            this._devices.splice(index, 1);
            await this.saveDevices();
        }
    }

    async revokeAllDevices(): Promise<void> {
        this._devices = this._devices.filter(d => d.isCurrent);
        await this.saveDevices();
    }

    async updateDeviceLastSeen(deviceId: string): Promise<void> {
        const device = this._devices.find(d => d.deviceId === deviceId);
        if (device) {
            device.lastSeen = Date.now();
            await this.saveDevices();
        }
    }

    async publishDeviceList(privkey: string): Promise<DeviceListEvent> {
        const event = createDeviceListEvent(this._devices, privkey);
        return event;
    }

    async publishSessionEvent(device: LinkedDevice, sessionPrivkey: string): Promise<DeviceSessionEvent> {
        const sessionPubkey = getPublicKey(hexToBytes(sessionPrivkey));
        const event = createDeviceSessionEvent(device, sessionPubkey, this._currentPrivkey!);
        return event;
    }

    mergeDevices(incomingDevices: LinkedDevice[]): { added: number; updated: number; removed: number } {
        let added = 0;
        let updated = 0;
        let removed = 0;

        const incomingMap = new Map(incomingDevices.map(d => [d.deviceId, d]));
        const currentMap = new Map(this._devices.map(d => [d.deviceId, d]));

        for (const [id, device] of incomingMap) {
            if (!currentMap.has(id)) {
                this._devices.push(device);
                added++;
            } else {
                const current = currentMap.get(id)!;
                if (device.lastSeen > current.lastSeen) {
                    this._devices = this._devices.map(d => d.deviceId === id ? device : d);
                    updated++;
                }
            }
        }

        for (const [id, device] of currentMap) {
            if (!incomingMap.has(id) && !device.isCurrent) {
                this._devices = this._devices.filter(d => d.deviceId !== id);
                removed++;
            }
        }

        if (added > 0 || updated > 0 || removed > 0) {
            this.saveDevices();
        }

        return { added, updated, removed };
    }

    getDeviceById(deviceId: string): LinkedDevice | undefined {
        return this._devices.find(d => d.deviceId === deviceId);
    }

    hasDevice(deviceId: string): boolean {
        return this._devices.some(d => d.deviceId === deviceId);
    }

    getLinkedDeviceCount(): number {
        return this._devices.filter(d => !d.isCurrent).length;
    }

    async clear(): Promise<void> {
        this._devices = [];
        await this._store.clear();
    }
}

export function createDeviceManager(config?: MultiDeviceConfig): DeviceManager {
    return new DeviceManager(config);
}