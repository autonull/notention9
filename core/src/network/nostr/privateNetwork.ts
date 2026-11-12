import { finalizeEvent, getPublicKey, generateSecretKey, verifyEvent, getEventHash } from 'nostr-tools/pure';
import { nsecEncode, npubEncode, decode } from 'nostr-tools/nip19';
import { hexToBytes, bytesToHex } from '../../utils/encoding.js';
import { Logger } from '../../utils/logging.js';
import type { NostrEvent } from '../../types/index.js';

const logger = Logger.create('PrivateNetwork');

export interface NetworkInvite {
    name: string;
    relays: string[];
    adminPubkey: string;
    nip42Token?: string;
    createdAt: number;
    version: number;
}

export interface NetworkMember {
    npub: string;
    pubkey: string;
    role: 'admin' | 'member';
    joinedAt: number;
    invitedBy?: string;
}

export interface NetworkState {
    id: string;
    name: string;
    relays: string[];
    adminPubkey: string;
    members: Map<string, NetworkMember>;
    nip42Token?: string;
    createdAt: number;
    updatedAt: number;
}

export interface SignedInviteEvent {
    kind: 35001;
    tags: string[][];
    content: string;
    created_at: number;
    pubkey: string;
    id: string;
    sig: string;
}

export interface SignedMemberEvent {
    kind: 35002;
    tags: string[][];
    content: string;
    created_at: number;
    pubkey: string;
    id: string;
    sig: string;
}

export interface SignedRelayEvent {
    kind: 35003;
    tags: string[][];
    content: string;
    created_at: number;
    pubkey: string;
    id: string;
    sig: string;
}

export interface SignedRevokeEvent {
    kind: 35004;
    tags: string[][];
    content: string;
    created_at: number;
    pubkey: string;
    id: string;
    sig: string;
}

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

function nsecDecode(nsec: string): string | null {
    try {
        const result = decode(nsec);
        if (result.type === 'nsec') {
            return bytesToHex(result.data as Uint8Array);
        }
        return null;
    } catch {
        return null;
    }
}

export function encodeInviteToString(invite: NetworkInvite): string {
    const json = JSON.stringify(invite);
    const bytes = new TextEncoder().encode(json);
    return btoa(String.fromCharCode(...bytes));
}

export function decodeInviteFromString(str: string): NetworkInvite | null {
    try {
        const bytes = Uint8Array.from(atob(str), c => c.charCodeAt(0));
        const json = new TextDecoder().decode(bytes);
        const invite = JSON.parse(json);
        if (invite.name && Array.isArray(invite.relays) && invite.adminPubkey && invite.version === 1) {
            return invite as NetworkInvite;
        }
        return null;
    } catch {
        return null;
    }
}

export function generateInvite(
    name: string,
    relays: string[],
    adminPrivkey: string,
    nip42Token?: string
): NetworkInvite {
    const adminPubkey = getPublicKey(hexToBytes(adminPrivkey));
    return {
        name,
        relays,
        adminPubkey,
        nip42Token,
        createdAt: Date.now(),
        version: 1,
    };
}

export function createInviteEvent(invite: NetworkInvite, adminPrivkey: string): SignedInviteEvent {
    const tags: string[][] = [
        ['d', `invite_${invite.adminPubkey}_${invite.createdAt}`],
        ['name', invite.name],
        ...invite.relays.map(r => ['relay', r]),
        ['admin', invite.adminPubkey],
        ['version', invite.version.toString()],
        ['t', 'private-network-invite'],
    ];

    if (invite.nip42Token) {
        tags.push(['token', invite.nip42Token]);
    }

    const event: SignedInviteEvent = {
        kind: 35001,
        tags,
        content: JSON.stringify(invite),
        created_at: Math.floor(invite.createdAt / 1000),
        pubkey: invite.adminPubkey,
        id: '',
        sig: '',
    };

    event.id = getEventHash(event);
    const signed = finalizeEvent(event, hexToBytes(adminPrivkey));
    return signed;
}

export function createMemberEvent(
    networkId: string,
    member: NetworkMember,
    adminPrivkey: string,
    action: 'add' | 'remove'
): SignedMemberEvent {
    const tags: string[][] = [
        ['d', `member_${networkId}_${member.pubkey}_${Date.now()}`],
        ['network', networkId],
        ['member', member.pubkey],
        ['role', member.role],
        ['action', action],
        ['t', 'private-network-member'],
    ];

    if (member.invitedBy) {
        tags.push(['invitedBy', member.invitedBy]);
    }

    const adminPubkey = getPublicKey(hexToBytes(adminPrivkey));
    const event: SignedMemberEvent = {
        kind: 35002,
        tags,
        content: JSON.stringify({ networkId, member, action }),
        created_at: Math.floor(Date.now() / 1000),
        pubkey: adminPubkey,
        id: '',
        sig: '',
    };

    event.id = getEventHash(event);
    const signed = finalizeEvent(event, hexToBytes(adminPrivkey));
    return signed;
}

export function createRelayEvent(
    networkId: string,
    relay: string,
    adminPrivkey: string,
    action: 'add' | 'remove'
): SignedRelayEvent {
    const adminPubkey = getPublicKey(hexToBytes(adminPrivkey));
    const tags: string[][] = [
        ['d', `relay_${networkId}_${relay}_${Date.now()}`],
        ['network', networkId],
        ['relay', relay],
        ['action', action],
        ['t', 'private-network-relay'],
    ];

    const event: SignedRelayEvent = {
        kind: 35003,
        tags,
        content: JSON.stringify({ networkId, relay, action }),
        created_at: Math.floor(Date.now() / 1000),
        pubkey: adminPubkey,
        id: '',
        sig: '',
    };

    event.id = getEventHash(event);
    const signed = finalizeEvent(event, hexToBytes(adminPrivkey));
    return signed;
}

export function createRevokeEvent(
    networkId: string,
    targetPubkey: string,
    adminPrivkey: string,
    reason?: string
): SignedRevokeEvent {
    const adminPubkey = getPublicKey(hexToBytes(adminPrivkey));
    const tags: string[][] = [
        ['d', `revoke_${networkId}_${targetPubkey}_${Date.now()}`],
        ['network', networkId],
        ['target', targetPubkey],
        ['t', 'private-network-revoke'],
    ];

    if (reason) {
        tags.push(['reason', reason]);
    }

    const event: SignedRevokeEvent = {
        kind: 35004,
        tags,
        content: JSON.stringify({ networkId, targetPubkey, reason }),
        created_at: Math.floor(Date.now() / 1000),
        pubkey: adminPubkey,
        id: '',
        sig: '',
    };

    event.id = getEventHash(event);
    const signed = finalizeEvent(event, hexToBytes(adminPrivkey));
    return signed;
}

export function verifyInviteEvent(event: SignedInviteEvent): boolean {
    if (event.kind !== 35001) return false;
    if (!verifyEvent(event)) return false;
    const dTag = event.tags.find(t => t[0] === 'd');
    if (!dTag || !dTag[1].startsWith('invite_')) return false;
    return true;
}

export function verifyMemberEvent(event: SignedMemberEvent): boolean {
    if (event.kind !== 35002) return false;
    if (!verifyEvent(event)) return false;
    const dTag = event.tags.find(t => t[0] === 'd');
    if (!dTag || !dTag[1].startsWith('member_')) return false;
    return true;
}

export function verifyRelayEvent(event: SignedRelayEvent): boolean {
    if (event.kind !== 35003) return false;
    if (!verifyEvent(event)) return false;
    const dTag = event.tags.find(t => t[0] === 'd');
    if (!dTag || !dTag[1].startsWith('relay_')) return false;
    return true;
}

export function verifyRevokeEvent(event: SignedRevokeEvent): boolean {
    if (event.kind !== 35004) return false;
    if (!verifyEvent(event)) return false;
    const dTag = event.tags.find(t => t[0] === 'd');
    if (!dTag || !dTag[1].startsWith('revoke_')) return false;
    return true;
}

export function extractInviteFromEvent(event: SignedInviteEvent): NetworkInvite | null {
    if (!verifyInviteEvent(event)) return null;
    try {
        return JSON.parse(event.content) as NetworkInvite;
    } catch {
        return null;
    }
}

export function extractMemberFromEvent(event: SignedMemberEvent): { networkId: string; member: NetworkMember; action: 'add' | 'remove' } | null {
    if (!verifyMemberEvent(event)) return null;
    try {
        return JSON.parse(event.content) as { networkId: string; member: NetworkMember; action: 'add' | 'remove' };
    } catch {
        return null;
    }
}

export function extractRelayFromEvent(event: SignedRelayEvent): { networkId: string; relay: string; action: 'add' | 'remove' } | null {
    if (!verifyRelayEvent(event)) return null;
    try {
        return JSON.parse(event.content) as { networkId: string; relay: string; action: 'add' | 'remove' };
    } catch {
        return null;
    }
}

export function extractRevokeFromEvent(event: SignedRevokeEvent): { networkId: string; targetPubkey: string; reason?: string } | null {
    if (!verifyRevokeEvent(event)) return null;
    try {
        return JSON.parse(event.content) as { networkId: string; targetPubkey: string; reason?: string };
    } catch {
        return null;
    }
}

export class PrivateNetworkManager {
    private network: NetworkState | null = null;
    private localRelay: LocalRelay | null = null;
    private adminPrivkey: string | null = null;
    private eventHandlers: Map<string, Set<(event: any) => void>> = new Map();

    constructor(localRelay?: LocalRelay) {
        this.localRelay = localRelay ?? null;
    }

    setLocalRelay(relay: LocalRelay): void {
        this.localRelay = relay;
    }

    async createNetwork(
        name: string,
        relays: string[],
        adminPrivkey: string,
        nip42Token?: string
    ): Promise<NetworkInvite> {
        this.adminPrivkey = adminPrivkey;
        const adminPubkey = getPublicKey(hexToBytes(adminPrivkey));

        const invite = generateInvite(name, relays, adminPrivkey, nip42Token);
        
        this.network = {
            id: `net_${adminPubkey}_${invite.createdAt}`,
            name: invite.name,
            relays: [...invite.relays],
            adminPubkey,
            members: new Map(),
            nip42Token: invite.nip42Token,
            createdAt: invite.createdAt,
            updatedAt: invite.createdAt,
        };

        this.network.members.set(adminPubkey, {
            npub: npubEncode(adminPubkey),
            pubkey: adminPubkey,
            role: 'admin',
            joinedAt: invite.createdAt,
        });

        return invite;
    }

    async joinNetwork(invite: NetworkInvite, memberPrivkey: string): Promise<NetworkState> {
        const memberPubkey = getPublicKey(hexToBytes(memberPrivkey));
        const memberNpub = npubEncode(memberPubkey);

        if (!this.network) {
            this.network = {
                id: `net_${invite.adminPubkey}_${invite.createdAt}`,
                name: invite.name,
                relays: [...invite.relays],
                adminPubkey: invite.adminPubkey,
                members: new Map(),
                nip42Token: invite.nip42Token,
                createdAt: invite.createdAt,
                updatedAt: Date.now(),
            };
        }

        if (this.network.adminPubkey !== invite.adminPubkey) {
            throw new Error('Invite admin mismatch');
        }

        const existingMember = this.network.members.get(memberPubkey);
        if (existingMember) {
            return this.network;
        }

        const member: NetworkMember = {
            npub: memberNpub,
            pubkey: memberPubkey,
            role: 'member',
            joinedAt: Date.now(),
            invitedBy: invite.adminPubkey,
        };

        this.network.members.set(memberPubkey, member);
        this.network.updatedAt = Date.now();

        this.emit('member_added', member);

        return this.network;
    }

    getNetwork(): NetworkState | null {
        return this.network;
    }

    getMembers(): NetworkMember[] {
        if (!this.network) return [];
        return Array.from(this.network.members.values());
    }

    getRelays(): string[] {
        if (!this.network) return [];
        return [...this.network.relays];
    }

    isAdmin(pubkey: string): boolean {
        if (!this.network) return false;
        const member = this.network.members.get(pubkey);
        return member?.role === 'admin' && member.pubkey === this.network.adminPubkey;
    }

    async addRelay(relay: string, adminPrivkey: string): Promise<void> {
        if (!this.network) throw new Error('No network joined');
        if (!this.isAdmin(getPublicKey(hexToBytes(adminPrivkey)))) {
            throw new Error('Only admin can add relays');
        }

        if (this.network.relays.includes(relay)) return;

        this.network.relays.push(relay);
        this.network.updatedAt = Date.now();

        const event = createRelayEvent(this.network.id, relay, adminPrivkey, 'add');
        await this.publishEvent(event);

        this.emit('relay_added', { networkId: this.network.id, relay });
    }

    async removeRelay(relay: string, adminPrivkey: string): Promise<void> {
        if (!this.network) throw new Error('No network joined');
        if (!this.isAdmin(getPublicKey(hexToBytes(adminPrivkey)))) {
            throw new Error('Only admin can remove relays');
        }

        if (!this.network.relays.includes(relay)) return;

        this.network.relays = this.network.relays.filter(r => r !== relay);
        this.network.updatedAt = Date.now();

        const event = createRelayEvent(this.network.id, relay, adminPrivkey, 'remove');
        await this.publishEvent(event);

        this.emit('relay_removed', { networkId: this.network.id, relay });
    }

    async revokeMember(targetPubkey: string, adminPrivkey: string, reason?: string): Promise<void> {
        if (!this.network) throw new Error('No network joined');
        if (!this.isAdmin(getPublicKey(hexToBytes(adminPrivkey)))) {
            throw new Error('Only admin can revoke members');
        }

        if (targetPubkey === this.network.adminPubkey) {
            throw new Error('Cannot revoke admin');
        }

        const member = this.network.members.get(targetPubkey);
        if (!member) return;

        this.network.members.delete(targetPubkey);
        this.network.updatedAt = Date.now();

        const event = createRevokeEvent(this.network.id, targetPubkey, adminPrivkey, reason);
        await this.publishEvent(event);

        this.emit('member_revoked', { networkId: this.network.id, targetPubkey, reason });
    }

    async addMember(targetPrivkey: string, adminPrivkey: string): Promise<NetworkMember> {
        if (!this.network) throw new Error('No network joined');
        if (!this.isAdmin(getPublicKey(hexToBytes(adminPrivkey)))) {
            throw new Error('Only admin can add members');
        }

        const targetPubkey = getPublicKey(hexToBytes(targetPrivkey));
        
        if (this.network.members.has(targetPubkey)) {
            throw new Error('Member already in network');
        }

        const member: NetworkMember = {
            npub: npubEncode(targetPubkey),
            pubkey: targetPubkey,
            role: 'member',
            joinedAt: Date.now(),
            invitedBy: this.network.adminPubkey,
        };

        this.network.members.set(targetPubkey, member);
        this.network.updatedAt = Date.now();

        const event = createMemberEvent(this.network.id, member, adminPrivkey, 'add');
        await this.publishEvent(event);

        this.emit('member_added', member);

        return member;
    }

    private async publishEvent(event: any): Promise<void> {
        if (this.localRelay) {
            const success = this.localRelay.publish({
                id: event.id,
                pubkey: event.pubkey,
                created_at: event.created_at,
                kind: event.kind,
                tags: event.tags,
                content: event.content,
                sig: event.sig,
                protocolVersion: 1,
            });
            if (!success) {
                logger.warn(`Failed to publish network event ${event.kind}`);
            }
        }
    }

    on(event: string, callback: (data: any) => void): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(callback);
    }

    off(event: string, callback: (data: any) => void): void {
        this.eventHandlers.get(event)?.delete(callback);
    }

    private emit(event: string, data: any): void {
        this.eventHandlers.get(event)?.forEach(cb => cb(data));
    }

    async syncFromEvents(events: any[]): Promise<void> {
        if (!this.network) return;

        for (const event of events) {
            if (event.kind === 35002) {
                const extracted = extractMemberFromEvent(event);
                if (extracted && extracted.networkId === this.network.id) {
                    if (extracted.action === 'add') {
                        this.network.members.set(extracted.member.pubkey, extracted.member);
                    } else {
                        this.network.members.delete(extracted.member.pubkey);
                    }
                    this.network.updatedAt = Math.max(this.network.updatedAt, event.created_at * 1000);
                }
            } else if (event.kind === 35003) {
                const extracted = extractRelayFromEvent(event);
                if (extracted && extracted.networkId === this.network.id) {
                    if (extracted.action === 'add') {
                        if (!this.network.relays.includes(extracted.relay)) {
                            this.network.relays.push(extracted.relay);
                        }
                    } else {
                        this.network.relays = this.network.relays.filter(r => r !== extracted.relay);
                    }
                    this.network.updatedAt = Math.max(this.network.updatedAt, event.created_at * 1000);
                }
            } else if (event.kind === 35004) {
                const extracted = extractRevokeFromEvent(event);
                if (extracted && extracted.networkId === this.network.id) {
                    this.network.members.delete(extracted.targetPubkey);
                    this.network.updatedAt = Math.max(this.network.updatedAt, event.created_at * 1000);
                }
            }
        }

        this.emit('sync_complete', this.network);
    }
}

export function createPrivateNetworkManager(localRelay?: LocalRelay): PrivateNetworkManager {
    return new PrivateNetworkManager(localRelay);
}