import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    KIND_DEVICE_LIST,
    KIND_DEVICE_SESSION,
    KIND_DEVICE_LINK,
    encodeDeviceLinkToString,
    decodeDeviceLinkFromString,
    createDeviceLink,
    createDeviceListEvent,
    createDeviceSessionEvent,
    verifyDeviceListEvent,
    verifyDeviceSessionEvent,
    extractDevicesFromEvent,
    extractSessionFromEvent,
    DeviceManager,
    createDeviceManager,
    type DeviceLinkPayload,
    type LinkedDevice,
} from './multiDevice.js';
import { finalizeEvent, getPublicKey, getEventHash, verifyEvent } from 'nostr-tools/pure';
import { hexToBytes, bytesToHex } from '../../utils/encoding.js';
import { nip19 } from 'nostr-tools';

const TEST_PRIVKEY = 'a'.repeat(64);
const TEST_PUBKEY = getPublicKey(hexToBytes(TEST_PRIVKEY));
const TEST_NPUB = nip19.npubEncode(TEST_PUBKEY);

describe('MultiDevice - Device Link Encoding', () => {
    it('should encode and decode device link round-trip', () => {
        const link = createDeviceLink(
            TEST_NPUB,
            'device-123',
            'Test Device',
            'desktop',
            ['wss://relay1.example.com', 'wss://relay2.example.com'],
            86400000
        );

        const encoded = encodeDeviceLinkToString(link);
        const decoded = decodeDeviceLinkFromString(encoded);

        expect(decoded).not.toBeNull();
        expect(decoded!.npub).toBe(TEST_NPUB);
        expect(decoded!.deviceId).toBe('device-123');
        expect(decoded!.deviceName).toBe('Test Device');
        expect(decoded!.platform).toBe('desktop');
        expect(decoded!.relays).toEqual(['wss://relay1.example.com', 'wss://relay2.example.com']);
        expect(decoded!.version).toBe(1);
    });

    it('should return null for invalid base64', () => {
        const result = decodeDeviceLinkFromString('not-valid-base64!@#');
        expect(result).toBeNull();
    });

    it('should return null for malformed JSON', () => {
        const encoded = btoa('not-json');
        const result = decodeDeviceLinkFromString(encoded);
        expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
        const link = { npub: TEST_NPUB, version: 1 };
        const encoded = encodeDeviceLinkToString(link as DeviceLinkPayload);
        const result = decodeDeviceLinkFromString(encoded);
        expect(result).toBeNull();
    });

    it('should return null for wrong version', () => {
        const link = createDeviceLink(TEST_NPUB, 'device-1', 'Test', 'desktop', []);
        link.version = 2;
        const encoded = encodeDeviceLinkToString(link);
        const result = decodeDeviceLinkFromString(encoded);
        expect(result).toBeNull();
    });
});

describe('MultiDevice - Device List Event', () => {
    it('should create a valid device list event', () => {
        const devices: LinkedDevice[] = [
            {
                deviceId: 'device-1',
                name: 'Laptop',
                platform: 'desktop',
                linkedAt: Date.now() - 86400000,
                lastSeen: Date.now() - 3600000,
                relays: ['wss://relay1.example.com'],
                isCurrent: true,
            },
            {
                deviceId: 'device-2',
                name: 'Phone',
                platform: 'mobile',
                linkedAt: Date.now() - 43200000,
                lastSeen: Date.now() - 1800000,
                relays: ['wss://relay2.example.com'],
                isCurrent: false,
            },
        ];

        const event = createDeviceListEvent(devices, TEST_PRIVKEY);

        expect(event.kind).toBe(KIND_DEVICE_LIST);
        expect(event.pubkey).toBe(TEST_PUBKEY);
        expect(event.tags.some(t => t[0] === 'd' && t[1].startsWith('devices_'))).toBe(true);
        expect(event.tags.some(t => t[0] === 't' && t[1] === 'device-list')).toBe(true);

        const parsed = JSON.parse(event.content);
        expect(parsed.devices).toHaveLength(2);
        expect(parsed.devices[0].deviceId).toBe('device-1');
        expect(parsed.devices[1].deviceId).toBe('device-2');

        expect(verifyEvent(event)).toBe(true);
        expect(event.id).toBe(getEventHash(event));
    });

    it('should verify a valid device list event', () => {
        const devices: LinkedDevice[] = [
            {
                deviceId: 'device-1',
                name: 'Laptop',
                platform: 'desktop',
                linkedAt: Date.now(),
                lastSeen: Date.now(),
                relays: ['wss://relay1.example.com'],
                isCurrent: true,
            },
        ];

        const event = createDeviceListEvent(devices, TEST_PRIVKEY);
        expect(verifyDeviceListEvent(event)).toBe(true);
    });

    it('should reject event with wrong kind', () => {
        const devices: LinkedDevice[] = [];
        const event = createDeviceListEvent(devices, TEST_PRIVKEY);
        event.kind = 9999;
        expect(verifyDeviceListEvent(event)).toBe(false);
    });

    it('should reject event with invalid d tag', () => {
        const devices: LinkedDevice[] = [];
        const event = createDeviceListEvent(devices, TEST_PRIVKEY);
        event.tags = [['d', 'invalid_tag']];
        expect(verifyDeviceListEvent(event)).toBe(false);
    });

    it('should extract devices from event', () => {
        const devices: LinkedDevice[] = [
            {
                deviceId: 'device-1',
                name: 'Laptop',
                platform: 'desktop',
                linkedAt: Date.now(),
                lastSeen: Date.now(),
                relays: ['wss://relay1.example.com'],
                isCurrent: true,
            },
        ];

        const event = createDeviceListEvent(devices, TEST_PRIVKEY);
        const extracted = extractDevicesFromEvent(event);

        expect(extracted).not.toBeNull();
        expect(extracted).toHaveLength(1);
        expect(extracted![0].deviceId).toBe('device-1');
        expect(extracted![0].name).toBe('Laptop');
    });

    it('should return null for invalid event', () => {
        const event = createDeviceListEvent([], TEST_PRIVKEY);
        event.kind = 9999;
        const extracted = extractDevicesFromEvent(event);
        expect(extracted).toBeNull();
    });
});

describe('MultiDevice - Device Session Event', () => {
    it('should create a valid device session event', () => {
        const device: LinkedDevice = {
            deviceId: 'device-1',
            name: 'Laptop',
            platform: 'desktop',
            linkedAt: Date.now(),
            lastSeen: Date.now(),
            relays: ['wss://relay1.example.com'],
            isCurrent: true,
        };

        const sessionPrivkey = 'b'.repeat(64);
        const sessionPubkey = getPublicKey(hexToBytes(sessionPrivkey));

        const event = createDeviceSessionEvent(device, sessionPubkey, TEST_PRIVKEY);

        expect(event.kind).toBe(KIND_DEVICE_SESSION);
        expect(event.pubkey).toBe(TEST_PUBKEY);
        expect(event.tags.some(t => t[0] === 'd' && t[1].startsWith('session_'))).toBe(true);
        expect(event.tags.some(t => t[0] === 'device' && t[1] === 'device-1')).toBe(true);
        expect(event.tags.some(t => t[0] === 'session' && t[1] === sessionPubkey)).toBe(true);
        expect(event.tags.some(t => t[0] === 'name' && t[1] === 'Laptop')).toBe(true);
        expect(event.tags.some(t => t[0] === 'platform' && t[1] === 'desktop')).toBe(true);
        expect(event.tags.some(t => t[0] === 't' && t[1] === 'device-session')).toBe(true);

        const parsed = JSON.parse(event.content);
        expect(parsed.deviceId).toBe('device-1');
        expect(parsed.sessionPubkey).toBe(sessionPubkey);
        expect(parsed.relays).toEqual(['wss://relay1.example.com']);

        expect(verifyEvent(event)).toBe(true);
        expect(event.id).toBe(getEventHash(event));
    });

    it('should verify a valid device session event', () => {
        const device: LinkedDevice = {
            deviceId: 'device-1',
            name: 'Laptop',
            platform: 'desktop',
            linkedAt: Date.now(),
            lastSeen: Date.now(),
            relays: ['wss://relay1.example.com'],
            isCurrent: true,
        };

        const sessionPrivkey = 'b'.repeat(64);
        const sessionPubkey = getPublicKey(hexToBytes(sessionPrivkey));

        const event = createDeviceSessionEvent(device, sessionPubkey, TEST_PRIVKEY);
        expect(verifyDeviceSessionEvent(event)).toBe(true);
    });

    it('should reject event with wrong kind', () => {
        const device: LinkedDevice = {
            deviceId: 'device-1',
            name: 'Laptop',
            platform: 'desktop',
            linkedAt: Date.now(),
            lastSeen: Date.now(),
            relays: ['wss://relay1.example.com'],
            isCurrent: true,
        };

        const sessionPrivkey = 'b'.repeat(64);
        const sessionPubkey = getPublicKey(hexToBytes(sessionPrivkey));

        const event = createDeviceSessionEvent(device, sessionPubkey, TEST_PRIVKEY);
        event.kind = 9999;
        expect(verifyDeviceSessionEvent(event)).toBe(false);
    });

    it('should extract session from event', () => {
        const device: LinkedDevice = {
            deviceId: 'device-1',
            name: 'Laptop',
            platform: 'desktop',
            linkedAt: Date.now(),
            lastSeen: Date.now(),
            relays: ['wss://relay1.example.com'],
            isCurrent: true,
        };

        const sessionPrivkey = 'b'.repeat(64);
        const sessionPubkey = getPublicKey(hexToBytes(sessionPrivkey));

        const event = createDeviceSessionEvent(device, sessionPubkey, TEST_PRIVKEY);
        const extracted = extractSessionFromEvent(event);

        expect(extracted).not.toBeNull();
        expect(extracted!.deviceId).toBe('device-1');
        expect(extracted!.sessionPubkey).toBe(sessionPubkey);
        expect(extracted!.relays).toEqual(['wss://relay1.example.com']);
    });
});

describe('MultiDevice - DeviceManager', () => {
    let manager: DeviceManager;
    let testStorageKey: string;

    beforeEach(() => {
        testStorageKey = `test-devices-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        manager = createDeviceManager({
            deviceName: 'Test Device',
            platform: 'test',
            defaultRelays: ['wss://test.example.com'],
            storageKey: testStorageKey,
        });
    });

    afterEach(async () => {
        await manager.clear();
    });

    it('should initialize with current device', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const devices = manager.devices;
        expect(devices).toHaveLength(1);
        expect(devices[0].isCurrent).toBe(true);
        expect(devices[0].name).toBe('Test Device');
        expect(devices[0].platform).toBe('test');
        expect(devices[0].relays).toEqual(['wss://test.example.com']);
    });

    it('should generate unique device IDs', () => {
        const manager1 = createDeviceManager();
        const manager2 = createDeviceManager();
        expect(manager1.deviceId).not.toBe(manager2.deviceId);
    });

    it('should create device link', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const link = await manager.createLink();
        expect(link.npub).toBe(TEST_NPUB);
        expect(link.deviceId).toBe(manager.deviceId);
        expect(link.deviceName).toBe('Test Device');
        expect(link.platform).toBe('test');
        expect(link.relays).toEqual(['wss://test.example.com']);
        expect(link.version).toBe(1);
        expect(link.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should create link string', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const linkString = await manager.createLinkString();
        const decoded = decodeDeviceLinkFromString(linkString);
        expect(decoded).not.toBeNull();
        expect(decoded!.npub).toBe(TEST_NPUB);
    });

    it('should throw when creating link without identity', async () => {
        await expect(manager.createLink()).rejects.toThrow('Identity not set');
    });

    it('should parse and link device', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const linkString = await manager.createLinkString();

        const newManager = createDeviceManager({
            deviceName: 'New Device',
            platform: 'mobile',
            defaultRelays: ['wss://other.example.com'],
            storageKey: 'test-devices-2',
        });
        newManager.setIdentity(TEST_PRIVKEY);
        await newManager.initialize();

        const linkedDevice = await newManager.linkDevice(linkString, TEST_PRIVKEY);

        expect(linkedDevice.deviceId).toBe(manager.deviceId);
        expect(linkedDevice.name).toBe('Test Device');
        expect(linkedDevice.platform).toBe('test');
        expect(linkedDevice.relays).toEqual(['wss://test.example.com']);
        expect(linkedDevice.isCurrent).toBe(false);
    });

    it('should reject expired link', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const link = await manager.createLink();
        link.expiresAt = Date.now() - 1000;
        const linkString = encodeDeviceLinkToString(link);

        const newManager = createDeviceManager({
            storageKey: 'test-devices-3',
        });
        newManager.setIdentity(TEST_PRIVKEY);
        await newManager.initialize();

        await expect(newManager.linkDevice(linkString, TEST_PRIVKEY)).rejects.toThrow('expired');
    });

    it('should reject link with mismatched identity', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const linkString = await manager.createLinkString();

        const otherPrivkey = 'b'.repeat(64);
        const newManager = createDeviceManager({
            storageKey: 'test-devices-4',
        });
        newManager.setIdentity(otherPrivkey);
        await newManager.initialize();

        await expect(newManager.linkDevice(linkString, otherPrivkey)).rejects.toThrow('does not match');
    });

    it('should revoke device', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const linkString = await manager.createLinkString();

        const newManager = createDeviceManager({
            storageKey: 'test-devices-5',
        });
        newManager.setIdentity(TEST_PRIVKEY);
        await newManager.initialize();

        await newManager.linkDevice(linkString, TEST_PRIVKEY);
        expect(newManager.getLinkedDeviceCount()).toBe(1);

        await newManager.revokeDevice(manager.deviceId);
        expect(newManager.getLinkedDeviceCount()).toBe(0);
    });

    it('should revoke all devices', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const linkString = await manager.createLinkString();

        const newManager = createDeviceManager({
            storageKey: 'test-devices-6',
        });
        newManager.setIdentity(TEST_PRIVKEY);
        await newManager.initialize();

        await newManager.linkDevice(linkString, TEST_PRIVKEY);
        await newManager.linkDevice(linkString, TEST_PRIVKEY);
        expect(newManager.getLinkedDeviceCount()).toBe(1);

        await newManager.revokeAllDevices();
        expect(newManager.getLinkedDeviceCount()).toBe(0);
        expect(newManager.currentDevice).toBeDefined();
    });

    it('should update device last seen', async () => {
        vi.useFakeTimers();
        try {
            manager.setIdentity(TEST_PRIVKEY);
            await manager.initialize();

            const initialLastSeen = manager.currentDevice!.lastSeen;
            vi.advanceTimersByTime(1000);

            await manager.updateDeviceLastSeen(manager.deviceId);
            expect(manager.currentDevice!.lastSeen).toBeGreaterThan(initialLastSeen);
        } finally {
            vi.useRealTimers();
        }
    });

    it('should publish device list event', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const event = await manager.publishDeviceList(TEST_PRIVKEY);
        expect(event.kind).toBe(KIND_DEVICE_LIST);
        expect(verifyDeviceListEvent(event)).toBe(true);

        const extracted = extractDevicesFromEvent(event);
        expect(extracted).toHaveLength(1);
        expect(extracted![0].deviceId).toBe(manager.deviceId);
    });

    it('should publish session event', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const sessionPrivkey = 'b'.repeat(64);
        const sessionPubkey = getPublicKey(hexToBytes(sessionPrivkey));
        manager.setSessionPubkey(sessionPubkey);

        const event = await manager.publishSessionEvent(manager.currentDevice!, sessionPrivkey);
        expect(event.kind).toBe(KIND_DEVICE_SESSION);
        expect(verifyDeviceSessionEvent(event)).toBe(true);

        const extracted = extractSessionFromEvent(event);
        expect(extracted).not.toBeNull();
        expect(extracted!.deviceId).toBe(manager.deviceId);
        expect(extracted!.sessionPubkey).toBe(sessionPubkey);
    });

    it('should merge devices', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const incomingDevices: LinkedDevice[] = [
            {
                deviceId: 'device-new-1',
                name: 'New Device 1',
                platform: 'mobile',
                linkedAt: Date.now(),
                lastSeen: Date.now(),
                relays: ['wss://new.example.com'],
                isCurrent: false,
            },
            {
                deviceId: 'device-new-2',
                name: 'New Device 2',
                platform: 'desktop',
                linkedAt: Date.now(),
                lastSeen: Date.now(),
                relays: ['wss://new2.example.com'],
                isCurrent: false,
            },
        ];

        const result = manager.mergeDevices(incomingDevices);
        expect(result.added).toBe(2);
        expect(result.updated).toBe(0);
        expect(result.removed).toBe(0);
        expect(manager.getLinkedDeviceCount()).toBe(2);
    });

    it('should update existing devices on merge', async () => {
        vi.useFakeTimers();
        try {
            manager.setIdentity(TEST_PRIVKEY);
            await manager.initialize();

            const linkString = await manager.createLinkString();

            const newManager = createDeviceManager({
                storageKey: `test-devices-merge-${Date.now()}`,
            });
            newManager.setIdentity(TEST_PRIVKEY);
            await newManager.initialize();

            await newManager.linkDevice(linkString, TEST_PRIVKEY);
            const originalLastSeen = newManager.getDeviceById(manager.deviceId)!.lastSeen;

            vi.advanceTimersByTime(5000);

            const updatedDevices: LinkedDevice[] = [
                {
                    deviceId: manager.deviceId,
                    name: 'Updated Name',
                    platform: 'test',
                    linkedAt: Date.now() - 10000,
                    lastSeen: Date.now(),
                    relays: ['wss://updated.example.com'],
                    isCurrent: false,
                },
            ];

            const result = newManager.mergeDevices(updatedDevices);
            expect(result.added).toBe(0);
            expect(result.updated).toBe(1);
            expect(result.removed).toBe(0);
            expect(newManager.getDeviceById(manager.deviceId)!.name).toBe('Updated Name');
            expect(newManager.getDeviceById(manager.deviceId)!.lastSeen).toBeGreaterThan(originalLastSeen);
        } finally {
            vi.useRealTimers();
        }
    });

    it('should remove devices not in incoming list', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const linkString = await manager.createLinkString();

        const newManager = createDeviceManager({
            storageKey: 'test-devices-8',
        });
        newManager.setIdentity(TEST_PRIVKEY);
        await newManager.initialize();

        await newManager.linkDevice(linkString, TEST_PRIVKEY);
        expect(newManager.getLinkedDeviceCount()).toBe(1);

        const result = newManager.mergeDevices([]);
        expect(result.added).toBe(0);
        expect(result.updated).toBe(0);
        expect(result.removed).toBe(1);
        expect(newManager.getLinkedDeviceCount()).toBe(0);
    });

    it('should not remove current device on merge', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const result = manager.mergeDevices([]);
        expect(result.removed).toBe(0);
        expect(manager.currentDevice).toBeDefined();
    });

    it('should notify callbacks on device changes', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const linkString = await manager.createLinkString();

        const newManager = createDeviceManager({
            storageKey: `test-devices-callback-${Date.now()}`,
        });
        newManager.setIdentity(TEST_PRIVKEY);
        await newManager.initialize();

        const callback = vi.fn();
        const unsubscribe = newManager.onDevicesChange(callback);

        await newManager.linkDevice(linkString, TEST_PRIVKEY);

        expect(callback).toHaveBeenCalled();
        // Callback is called once after linkDevice with 2 devices (current + linked)
        const lastCall = callback.mock.calls[callback.mock.calls.length - 1];
        const calledDevices = lastCall[0];
        expect(calledDevices).toHaveLength(2);

        unsubscribe();
        callback.mockClear();
        await newManager.revokeDevice(manager.deviceId);
        expect(callback).not.toHaveBeenCalled();
    });

    it('should get device by ID', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const device = manager.getDeviceById(manager.deviceId);
        expect(device).toBeDefined();
        expect(device!.deviceId).toBe(manager.deviceId);

        const notFound = manager.getDeviceById('non-existent');
        expect(notFound).toBeUndefined();
    });

    it('should check if device exists', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        expect(manager.hasDevice(manager.deviceId)).toBe(true);
        expect(manager.hasDevice('non-existent')).toBe(false);
    });

    it('should clear all devices', async () => {
        manager.setIdentity(TEST_PRIVKEY);
        await manager.initialize();

        const linkString = await manager.createLinkString();

        const newManager = createDeviceManager({
            storageKey: 'test-devices-10',
        });
        newManager.setIdentity(TEST_PRIVKEY);
        await newManager.initialize();

        await newManager.linkDevice(linkString, TEST_PRIVKEY);
        expect(newManager.getLinkedDeviceCount()).toBe(1);

        await newManager.clear();
        expect(newManager.devices).toHaveLength(0);
        expect(newManager.currentDevice).toBeUndefined();
    });
});

describe('MultiDevice - Constants', () => {
    it('should have correct kind values', () => {
        expect(KIND_DEVICE_LIST).toBe(35010);
        expect(KIND_DEVICE_SESSION).toBe(35011);
        expect(KIND_DEVICE_LINK).toBe(35012);
    });
});