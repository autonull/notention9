import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    generateInvite,
    encodeInviteToString,
    decodeInviteFromString,
    createInviteEvent,
    createMemberEvent,
    createRelayEvent,
    createRevokeEvent,
    verifyInviteEvent,
    verifyMemberEvent,
    verifyRelayEvent,
    verifyRevokeEvent,
    extractInviteFromEvent,
    extractMemberFromEvent,
    extractRelayFromEvent,
    extractRevokeFromEvent,
    PrivateNetworkManager,
    createPrivateNetworkManager,
} from './privateNetwork.js';
import { LocalRelay } from './LocalRelay.js';
import { signEvent, generatePrivateKey, getPublicKey } from './protocol.js';
import { hexToBytes } from '../../utils/encoding.js';

describe('PrivateNetwork - Invite', () => {
    let adminPrivkey: string;
    let adminPubkey: string;

    beforeEach(() => {
        adminPrivkey = generatePrivateKey();
        adminPubkey = getPublicKey(hexToBytes(adminPrivkey));
    });

    it('should generate invite with name, relays, admin pubkey', () => {
        const invite = generateInvite('Test Network', ['wss://relay1', 'wss://relay2'], adminPrivkey);

        expect(invite.name).toBe('Test Network');
        expect(invite.relays).toEqual(['wss://relay1', 'wss://relay2']);
        expect(invite.adminPubkey).toBe(adminPubkey);
        expect(invite.version).toBe(1);
        expect(invite.createdAt).toBeGreaterThan(0);
    });

    it('should generate invite with optional NIP-42 token', () => {
        const invite = generateInvite('Test Network', ['wss://relay1'], adminPrivkey, 'nip42-token-123');

        expect(invite.nip42Token).toBe('nip42-token-123');
    });

    it('should encode and decode invite to/from string', () => {
        const invite = generateInvite('Test Network', ['wss://relay1', 'wss://relay2'], adminPrivkey, 'token-123');

        const encoded = encodeInviteToString(invite);
        expect(typeof encoded).toBe('string');
        expect(encoded.length).toBeGreaterThan(0);

        const decoded = decodeInviteFromString(encoded);
        expect(decoded).not.toBeNull();
        expect(decoded!.name).toBe(invite.name);
        expect(decoded!.relays).toEqual(invite.relays);
        expect(decoded!.adminPubkey).toBe(invite.adminPubkey);
        expect(decoded!.nip42Token).toBe(invite.nip42Token);
        expect(decoded!.version).toBe(invite.version);
    });

    it('should return null for invalid encoded string', () => {
        const decoded = decodeInviteFromString('invalid-base64!');
        expect(decoded).toBeNull();
    });

    it('should return null for malformed invite JSON', () => {
        const encoded = btoa(JSON.stringify({ name: 'Test' }));
        const decoded = decodeInviteFromString(encoded);
        expect(decoded).toBeNull();
    });
});

describe('PrivateNetwork - Signed Events', () => {
    let adminPrivkey: string;
    let adminPubkey: string;
    let memberPrivkey: string;
    let memberPubkey: string;

    beforeEach(() => {
        adminPrivkey = generatePrivateKey();
        adminPubkey = getPublicKey(hexToBytes(adminPrivkey));
        memberPrivkey = generatePrivateKey();
        memberPubkey = getPublicKey(hexToBytes(memberPrivkey));
    });

    describe('Invite Event (kind 35001)', () => {
        it('should create valid invite event', () => {
            const invite = generateInvite('Test Network', ['wss://relay1'], adminPrivkey);
            const event = createInviteEvent(invite, adminPrivkey);

            expect(event.kind).toBe(35001);
            expect(event.pubkey).toBe(adminPubkey);
            expect(event.tags.some(t => t[0] === 'd')).toBe(true);
            expect(event.tags.some(t => t[0] === 'name' && t[1] === 'Test Network')).toBe(true);
            expect(event.tags.some(t => t[0] === 'relay' && t[1] === 'wss://relay1')).toBe(true);
            expect(event.tags.some(t => t[0] === 'admin' && t[1] === adminPubkey)).toBe(true);
            expect(event.tags.some(t => t[0] === 't' && t[1] === 'private-network-invite')).toBe(true);
            expect(verifyInviteEvent(event)).toBe(true);
        });

        it('should include NIP-42 token when provided', () => {
            const invite = generateInvite('Test Network', ['wss://relay1'], adminPrivkey, 'nip42-token');
            const event = createInviteEvent(invite, adminPrivkey);

            expect(event.tags.some(t => t[0] === 'token' && t[1] === 'nip42-token')).toBe(true);
        });

        it('should extract invite from event', () => {
            const invite = generateInvite('Test Network', ['wss://relay1', 'wss://relay2'], adminPrivkey, 'token');
            const event = createInviteEvent(invite, adminPrivkey);
            const extracted = extractInviteFromEvent(event);

            expect(extracted).not.toBeNull();
            expect(extracted!.name).toBe('Test Network');
            expect(extracted!.relays).toEqual(['wss://relay1', 'wss://relay2']);
            expect(extracted!.adminPubkey).toBe(adminPubkey);
            expect(extracted!.nip42Token).toBe('token');
        });

        it('should reject invalid invite event', () => {
            const event = signEvent({
                kind: 35001,
                tags: [['d', 'invalid'], ['name', 'Test']],
                content: '{}',
                created_at: Math.floor(Date.now() / 1000),
            }, adminPrivkey);

            expect(verifyInviteEvent(event)).toBe(false);
            expect(extractInviteFromEvent(event)).toBeNull();
        });
    });

    describe('Member Event (kind 35002)', () => {
        const networkId = 'net_test_123';

        it('should create valid member add event', () => {
            const member = {
                npub: 'npub1...',
                pubkey: memberPubkey,
                role: 'member' as const,
                joinedAt: Date.now(),
                invitedBy: adminPubkey,
            };

            const event = createMemberEvent(networkId, member, adminPrivkey, 'add');

            expect(event.kind).toBe(35002);
            expect(event.pubkey).toBe(adminPubkey);
            expect(event.tags.some(t => t[0] === 'network' && t[1] === networkId)).toBe(true);
            expect(event.tags.some(t => t[0] === 'member' && t[1] === memberPubkey)).toBe(true);
            expect(event.tags.some(t => t[0] === 'role' && t[1] === 'member')).toBe(true);
            expect(event.tags.some(t => t[0] === 'action' && t[1] === 'add')).toBe(true);
            expect(event.tags.some(t => t[0] === 'invitedBy' && t[1] === adminPubkey)).toBe(true);
            expect(verifyMemberEvent(event)).toBe(true);
        });

        it('should create valid member remove event', () => {
            const member = {
                npub: 'npub1...',
                pubkey: memberPubkey,
                role: 'member' as const,
                joinedAt: Date.now(),
            };

            const event = createMemberEvent(networkId, member, adminPrivkey, 'remove');

            expect(event.tags.some(t => t[0] === 'action' && t[1] === 'remove')).toBe(true);
            expect(verifyMemberEvent(event)).toBe(true);
        });

        it('should extract member from event', () => {
            const member = {
                npub: 'npub1...',
                pubkey: memberPubkey,
                role: 'member' as const,
                joinedAt: Date.now(),
                invitedBy: adminPubkey,
            };

            const event = createMemberEvent(networkId, member, adminPrivkey, 'add');
            const extracted = extractMemberFromEvent(event);

            expect(extracted).not.toBeNull();
            expect(extracted!.networkId).toBe(networkId);
            expect(extracted!.member.pubkey).toBe(memberPubkey);
            expect(extracted!.action).toBe('add');
        });
    });

    describe('Relay Event (kind 35003)', () => {
        const networkId = 'net_test_123';

        it('should create valid relay add event', () => {
            const relay = 'wss://new-relay';
            const event = createRelayEvent(networkId, relay, adminPrivkey, 'add');

            expect(event.kind).toBe(35003);
            expect(event.pubkey).toBe(adminPubkey);
            expect(event.tags.some(t => t[0] === 'network' && t[1] === networkId)).toBe(true);
            expect(event.tags.some(t => t[0] === 'relay' && t[1] === relay)).toBe(true);
            expect(event.tags.some(t => t[0] === 'action' && t[1] === 'add')).toBe(true);
            expect(verifyRelayEvent(event)).toBe(true);
        });

        it('should create valid relay remove event', () => {
            const relay = 'wss://old-relay';
            const event = createRelayEvent(networkId, relay, adminPrivkey, 'remove');

            expect(event.tags.some(t => t[0] === 'action' && t[1] === 'remove')).toBe(true);
            expect(verifyRelayEvent(event)).toBe(true);
        });

        it('should extract relay from event', () => {
            const relay = 'wss://new-relay';
            const event = createRelayEvent(networkId, relay, adminPrivkey, 'add');
            const extracted = extractRelayFromEvent(event);

            expect(extracted).not.toBeNull();
            expect(extracted!.networkId).toBe(networkId);
            expect(extracted!.relay).toBe(relay);
            expect(extracted!.action).toBe('add');
        });
    });

    describe('Revoke Event (kind 35004)', () => {
        const networkId = 'net_test_123';

        it('should create valid revoke event', () => {
            const event = createRevokeEvent(networkId, memberPubkey, adminPrivkey, 'spam');

            expect(event.kind).toBe(35004);
            expect(event.pubkey).toBe(adminPubkey);
            expect(event.tags.some(t => t[0] === 'network' && t[1] === networkId)).toBe(true);
            expect(event.tags.some(t => t[0] === 'target' && t[1] === memberPubkey)).toBe(true);
            expect(event.tags.some(t => t[0] === 'reason' && t[1] === 'spam')).toBe(true);
            expect(verifyRevokeEvent(event)).toBe(true);
        });

        it('should create revoke event without reason', () => {
            const event = createRevokeEvent(networkId, memberPubkey, adminPrivkey);

            expect(event.tags.some(t => t[0] === 'reason')).toBe(false);
            expect(verifyRevokeEvent(event)).toBe(true);
        });

        it('should extract revoke from event', () => {
            const event = createRevokeEvent(networkId, memberPubkey, adminPrivkey, 'spam');
            const extracted = extractRevokeFromEvent(event);

            expect(extracted).not.toBeNull();
            expect(extracted!.networkId).toBe(networkId);
            expect(extracted!.targetPubkey).toBe(memberPubkey);
            expect(extracted!.reason).toBe('spam');
        });
    });
});

describe('PrivateNetworkManager', () => {
    let localRelay: LocalRelay;
    let manager: PrivateNetworkManager;
    let adminPrivkey: string;
    let adminPubkey: string;
    let memberPrivkey: string;
    let memberPubkey: string;

    beforeEach(() => {
        localRelay = new LocalRelay();
        manager = createPrivateNetworkManager(localRelay);
        adminPrivkey = generatePrivateKey();
        adminPubkey = getPublicKey(hexToBytes(adminPrivkey));
        memberPrivkey = generatePrivateKey();
        memberPubkey = getPublicKey(hexToBytes(memberPrivkey));
    });

    describe('createNetwork', () => {
        it('should create network and return invite', async () => {
            const invite = await manager.createNetwork('Test Network', ['wss://relay1', 'wss://relay2'], adminPrivkey);

            expect(invite.name).toBe('Test Network');
            expect(invite.relays).toEqual(['wss://relay1', 'wss://relay2']);
            expect(invite.adminPubkey).toBe(adminPubkey);

            const network = manager.getNetwork();
            expect(network).not.toBeNull();
            expect(network!.name).toBe('Test Network');
            expect(network!.relays).toEqual(['wss://relay1', 'wss://relay2']);
            expect(network!.adminPubkey).toBe(adminPubkey);
            expect(network!.members.size).toBe(1);
            expect(network!.members.has(adminPubkey)).toBe(true);
            expect(manager.isAdmin(adminPubkey)).toBe(true);
        });

        it('should include NIP-42 token in invite', async () => {
            const invite = await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey, 'nip42-token');
            expect(invite.nip42Token).toBe('nip42-token');
        });
    });

    describe('joinNetwork', () => {
        it('should join existing network with invite', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            const invite = encodeInviteToString(
                generateInvite('Test Network', ['wss://relay1'], adminPrivkey)
            );
            const decodedInvite = decodeInviteFromString(invite)!;

            const network = await manager.joinNetwork(decodedInvite, memberPrivkey);

            expect(network.members.size).toBe(2);
            expect(network.members.has(memberPubkey)).toBe(true);
            const member = network.members.get(memberPubkey)!;
            expect(member.role).toBe('member');
            expect(member.invitedBy).toBe(adminPubkey);
        });

        it('should reject invite with different admin', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            const otherPrivkey = generatePrivateKey();
            const otherPubkey = getPublicKey(hexToBytes(otherPrivkey));
            const fakeInvite = generateInvite('Test Network', ['wss://relay1'], otherPrivkey);

            await expect(manager.joinNetwork(fakeInvite, memberPrivkey)).rejects.toThrow('Invite admin mismatch');
        });

        it('should not duplicate member on re-join', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            const invite = decodeInviteFromString(encodeInviteToString(generateInvite('Test Network', ['wss://relay1'], adminPrivkey)))!;

            await manager.joinNetwork(invite, memberPrivkey);
            await manager.joinNetwork(invite, memberPrivkey);

            const network = manager.getNetwork()!;
            expect(network.members.size).toBe(2);
        });
    });

    describe('addRelay', () => {
        it('should allow admin to add relay', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            await manager.addRelay('wss://relay2', adminPrivkey);

            const network = manager.getNetwork()!;
            expect(network.relays).toContain('wss://relay2');
            expect(network.relays).toHaveLength(2);
        });

        it('should reject non-admin adding relay', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            await expect(manager.addRelay('wss://relay2', memberPrivkey)).rejects.toThrow('Only admin can add relays');
        });

        it('should not duplicate relay', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            await manager.addRelay('wss://relay1', adminPrivkey);

            const network = manager.getNetwork()!;
            expect(network.relays).toHaveLength(1);
        });

        it('should emit relay_added event', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            const events: any[] = [];
            manager.on('relay_added', (data) => events.push(data));
            
            await manager.addRelay('wss://relay2', adminPrivkey);
            
            expect(events).toHaveLength(1);
            expect(events[0].relay).toBe('wss://relay2');
        });
    });

    describe('removeRelay', () => {
        it('should allow admin to remove relay', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1', 'wss://relay2'], adminPrivkey);
            
            await manager.removeRelay('wss://relay1', adminPrivkey);

            const network = manager.getNetwork()!;
            expect(network.relays).not.toContain('wss://relay1');
            expect(network.relays).toHaveLength(1);
        });

        it('should reject non-admin removing relay', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            await expect(manager.removeRelay('wss://relay1', memberPrivkey)).rejects.toThrow('Only admin can remove relays');
        });

        it('should emit relay_removed event', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1', 'wss://relay2'], adminPrivkey);
            
            const events: any[] = [];
            manager.on('relay_removed', (data) => events.push(data));
            
            await manager.removeRelay('wss://relay1', adminPrivkey);
            
            expect(events).toHaveLength(1);
            expect(events[0].relay).toBe('wss://relay1');
        });
    });

    describe('revokeMember', () => {
        it('should allow admin to revoke member', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            await manager.joinNetwork(decodeInviteFromString(encodeInviteToString(generateInvite('Test Network', ['wss://relay1'], adminPrivkey)))!, memberPrivkey);
            
            await manager.revokeMember(memberPubkey, adminPrivkey, 'spam');

            const network = manager.getNetwork()!;
            expect(network.members.has(memberPubkey)).toBe(false);
            expect(network.members.size).toBe(1);
        });

        it('should reject non-admin revoking member', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            await manager.joinNetwork(decodeInviteFromString(encodeInviteToString(generateInvite('Test Network', ['wss://relay1'], adminPrivkey)))!, memberPrivkey);
            
            await expect(manager.revokeMember(memberPubkey, memberPrivkey)).rejects.toThrow('Only admin can revoke members');
        });

        it('should reject revoking admin', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            await expect(manager.revokeMember(adminPubkey, adminPrivkey)).rejects.toThrow('Cannot revoke admin');
        });

        it('should emit member_revoked event', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            await manager.joinNetwork(decodeInviteFromString(encodeInviteToString(generateInvite('Test Network', ['wss://relay1'], adminPrivkey)))!, memberPrivkey);
            
            const events: any[] = [];
            manager.on('member_revoked', (data) => events.push(data));
            
            await manager.revokeMember(memberPubkey, adminPrivkey, 'spam');
            
            expect(events).toHaveLength(1);
            expect(events[0].targetPubkey).toBe(memberPubkey);
            expect(events[0].reason).toBe('spam');
        });
    });

    describe('addMember', () => {
        it('should allow admin to add member directly', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            const newMemberPrivkey = generatePrivateKey();
            const newMemberPubkey = getPublicKey(hexToBytes(newMemberPrivkey));
            
            const member = await manager.addMember(newMemberPrivkey, adminPrivkey);

            expect(member.pubkey).toBe(newMemberPubkey);
            expect(member.role).toBe('member');
            expect(member.invitedBy).toBe(adminPubkey);

            const network = manager.getNetwork()!;
            expect(network.members.has(newMemberPubkey)).toBe(true);
        });

        it('should reject non-admin adding member', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            const newMemberPrivkey = generatePrivateKey();
            
            await expect(manager.addMember(newMemberPrivkey, memberPrivkey)).rejects.toThrow('Only admin can add members');
        });

        it('should reject adding existing member', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            await manager.joinNetwork(decodeInviteFromString(encodeInviteToString(generateInvite('Test Network', ['wss://relay1'], adminPrivkey)))!, memberPrivkey);
            
            await expect(manager.addMember(memberPrivkey, adminPrivkey)).rejects.toThrow('Member already in network');
        });

        it('should emit member_added event', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            const events: any[] = [];
            manager.on('member_added', (data) => events.push(data));
            
            const newMemberPrivkey = generatePrivateKey();
            await manager.addMember(newMemberPrivkey, adminPrivkey);
            
            expect(events).toHaveLength(1);
            expect(events[0].pubkey).toBe(getPublicKey(hexToBytes(newMemberPrivkey)));
        });
    });

    describe('syncFromEvents', () => {
        it('should sync member add events', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            const newMemberPrivkey = generatePrivateKey();
            const newMemberPubkey = getPublicKey(hexToBytes(newMemberPrivkey));
            const member = {
                npub: 'npub1...',
                pubkey: newMemberPubkey,
                role: 'member' as const,
                joinedAt: Date.now(),
                invitedBy: adminPubkey,
            };
            const event = createMemberEvent('net_test_123', member, adminPrivkey, 'add');
            
            // Need to match network ID
            const network = manager.getNetwork()!;
            event.tags = event.tags.map(t => t[0] === 'network' ? ['network', network.id] : t);
            event.id = ''; // Will be recomputed by verification
            
            // Re-sign with correct network ID
            const correctedEvent = createMemberEvent(network.id, member, adminPrivkey, 'add');
            
            await manager.syncFromEvents([correctedEvent]);
            
            const syncedNetwork = manager.getNetwork()!;
            expect(syncedNetwork.members.has(newMemberPubkey)).toBe(true);
        });

        it('should sync member remove events', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            await manager.joinNetwork(decodeInviteFromString(encodeInviteToString(generateInvite('Test Network', ['wss://relay1'], adminPrivkey)))!, memberPrivkey);
            
            const network = manager.getNetwork()!;
            const member = network.members.get(memberPubkey)!;
            const event = createMemberEvent(network.id, member, adminPrivkey, 'remove');
            
            await manager.syncFromEvents([event]);
            
            const syncedNetwork = manager.getNetwork()!;
            expect(syncedNetwork.members.has(memberPubkey)).toBe(false);
        });

        it('should sync relay add events', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            const network = manager.getNetwork()!;
            const event = createRelayEvent(network.id, 'wss://relay2', adminPrivkey, 'add');
            
            await manager.syncFromEvents([event]);
            
            const syncedNetwork = manager.getNetwork()!;
            expect(syncedNetwork.relays).toContain('wss://relay2');
        });

        it('should sync relay remove events', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1', 'wss://relay2'], adminPrivkey);
            
            const network = manager.getNetwork()!;
            const event = createRelayEvent(network.id, 'wss://relay1', adminPrivkey, 'remove');
            
            await manager.syncFromEvents([event]);
            
            const syncedNetwork = manager.getNetwork()!;
            expect(syncedNetwork.relays).not.toContain('wss://relay1');
        });

        it('should sync revoke events', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            await manager.joinNetwork(decodeInviteFromString(encodeInviteToString(generateInvite('Test Network', ['wss://relay1'], adminPrivkey)))!, memberPrivkey);
            
            const network = manager.getNetwork()!;
            const event = createRevokeEvent(network.id, memberPubkey, adminPrivkey, 'spam');
            
            await manager.syncFromEvents([event]);
            
            const syncedNetwork = manager.getNetwork()!;
            expect(syncedNetwork.members.has(memberPubkey)).toBe(false);
        });

        it('should ignore events for different network', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            
            const otherNetworkId = 'net_other_123';
            const event = createRelayEvent(otherNetworkId, 'wss://relay2', adminPrivkey, 'add');
            
            await manager.syncFromEvents([event]);
            
            const network = manager.getNetwork()!;
            expect(network.relays).not.toContain('wss://relay2');
        });
    });

    describe('getters', () => {
        it('should return members list', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1'], adminPrivkey);
            await manager.joinNetwork(decodeInviteFromString(encodeInviteToString(generateInvite('Test Network', ['wss://relay1'], adminPrivkey)))!, memberPrivkey);
            
            const members = manager.getMembers();
            expect(members).toHaveLength(2);
        });

        it('should return relays list', async () => {
            await manager.createNetwork('Test Network', ['wss://relay1', 'wss://relay2'], adminPrivkey);
            
            const relays = manager.getRelays();
            expect(relays).toEqual(['wss://relay1', 'wss://relay2']);
        });

        it('should return null for network before creation', () => {
            expect(manager.getNetwork()).toBeNull();
        });
    });
});