import { finalizeEvent, getEventHash, verifyEvent, getPublicKey } from 'nostr-tools/pure';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { hexToBytes, bytesToHex } from '../utils/encoding.js';
import type { Note, Property } from '../types/index.js';
import { Logger } from '../utils/logging.js';

const logger = Logger.create('MatchProtocol');

export type MatchState = 
    | 'draft' 
    | 'published' 
    | 'matched' 
    | 'responded' 
    | 'accepted' 
    | 'withdrawn' 
    | 'completed' 
    | 'cancelled';

export type MatchAction = 
    | 'publish' 
    | 'match' 
    | 'respond' 
    | 'accept' 
    | 'withdraw' 
    | 'complete' 
    | 'cancel';

export interface MatchReceipt {
    action: MatchAction;
    noteId: string;
    matchId: string;
    actorPubkey: string;
    targetPubkey?: string;
    previousEventId?: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

export interface SignedReceiptEvent {
    kind: number;
    tags: string[][];
    content: string;
    created_at: number;
    pubkey: string;
    id: string;
    sig: string;
}

export const MATCH_KINDS = {
    PUBLISH: 35100,
    MATCH: 35101,
    RESPOND: 35102,
    ACCEPT: 35103,
    WITHDRAW: 35104,
    COMPLETE: 35105,
    CANCEL: 35106,
} as const;

export function actionToKind(action: MatchAction): number {
    const map: Record<MatchAction, number> = {
        publish: MATCH_KINDS.PUBLISH,
        match: MATCH_KINDS.MATCH,
        respond: MATCH_KINDS.RESPOND,
        accept: MATCH_KINDS.ACCEPT,
        withdraw: MATCH_KINDS.WITHDRAW,
        complete: MATCH_KINDS.COMPLETE,
        cancel: MATCH_KINDS.CANCEL,
    };
    return map[action];
}

export function kindToAction(kind: number): MatchAction | null {
    const map: Record<number, MatchAction> = {
        [MATCH_KINDS.PUBLISH]: 'publish',
        [MATCH_KINDS.MATCH]: 'match',
        [MATCH_KINDS.RESPOND]: 'respond',
        [MATCH_KINDS.ACCEPT]: 'accept',
        [MATCH_KINDS.WITHDRAW]: 'withdraw',
        [MATCH_KINDS.COMPLETE]: 'complete',
        [MATCH_KINDS.CANCEL]: 'cancel',
    };
    return map[kind] ?? null;
}

export function deriveChainState(chain: ReceiptChain): MatchState {
    const kinds = new Set(chain.receipts.map(r => r.kind));
    if (kinds.has(MATCH_KINDS.COMPLETE)) return 'completed';
    if (kinds.has(MATCH_KINDS.CANCEL)) return 'cancelled';
    if (kinds.has(MATCH_KINDS.ACCEPT)) return 'accepted';
    if (kinds.has(MATCH_KINDS.WITHDRAW)) return 'withdrawn';
    if (kinds.has(MATCH_KINDS.RESPOND)) return 'responded';
    if (kinds.has(MATCH_KINDS.MATCH)) return 'matched';
    if (kinds.has(MATCH_KINDS.PUBLISH)) return 'published';
    return 'draft';
}

export function deriveNoteMatchStates(chains: ReceiptChain[]): Map<string, MatchState> {
    const states = new Map<string, MatchState>();
    for (const chain of chains) {
        const state = deriveChainState(chain);
        if (!states.has(chain.matchId) || statePriority(state) > statePriority(states.get(chain.matchId)!)) {
            states.set(chain.matchId, state);
        }
    }
    return states;
}

function statePriority(state: MatchState): number {
    const priorities: Record<MatchState, number> = {
        draft: 0,
        published: 1,
        matched: 2,
        responded: 3,
        accepted: 4,
        withdrawn: 5,
        completed: 6,
        cancelled: 7,
    };
    return priorities[state] ?? 0;
}

export function createReceipt(
    action: MatchAction,
    noteId: string,
    matchId: string,
    actorPrivkey: string,
    targetPubkey?: string,
    previousEventId?: string,
    metadata?: Record<string, unknown>
): SignedReceiptEvent {
    const actorPubkey = getPublicKey(hexToBytes(actorPrivkey));
    
    const receipt: MatchReceipt = {
        action,
        noteId,
        matchId,
        actorPubkey,
        targetPubkey,
        previousEventId,
        timestamp: Date.now(),
        metadata,
    };

    const tags: string[][] = [
        ['d', `match_${action}_${matchId}_${receipt.timestamp}`],
        ['match', matchId],
        ['note', noteId],
        ['action', action],
        ['actor', actorPubkey],
        ['t', 'match-receipt'],
    ];

    if (targetPubkey) {
        tags.push(['target', targetPubkey]);
    }

    if (previousEventId) {
        tags.push(['e', previousEventId, '', 'chain']);
    }

    if (metadata) {
        tags.push(['metadata', JSON.stringify(metadata)]);
    }

    const event: SignedReceiptEvent = {
        kind: actionToKind(action),
        tags,
        content: JSON.stringify(receipt),
        created_at: Math.floor(receipt.timestamp / 1000),
        pubkey: actorPubkey,
        id: '',
        sig: '',
    };

    event.id = getEventHash(event);
    const signed = finalizeEvent(event, hexToBytes(actorPrivkey));
    
    logger.debug(`Created ${action} receipt`, { matchId, eventId: event.id });
    return signed;
}

export function extractReceiptFromEvent(event: SignedReceiptEvent): MatchReceipt | null {
    try {
        const receipt = JSON.parse(event.content) as MatchReceipt;
        
        if (!receipt.action || !receipt.noteId || !receipt.matchId || !receipt.actorPubkey) {
            logger.warn('Receipt missing required fields');
            return null;
        }

        const dTag = event.tags.find(t => t[0] === 'd');
        if (!dTag || !dTag[1].startsWith(`match_${receipt.action}_`)) {
            logger.warn('Receipt d-tag mismatch');
            return null;
        }

        const matchTag = event.tags.find(t => t[0] === 'match');
        if (!matchTag || matchTag[1] !== receipt.matchId) {
            logger.warn('Receipt matchId mismatch');
            return null;
        }

        const noteTag = event.tags.find(t => t[0] === 'note');
        if (!noteTag || noteTag[1] !== receipt.noteId) {
            logger.warn('Receipt noteId mismatch');
            return null;
        }

        const actorTag = event.tags.find(t => t[0] === 'actor');
        if (!actorTag || actorTag[1] !== receipt.actorPubkey) {
            logger.warn('Receipt actor mismatch');
            return null;
        }

        return receipt;
    } catch (e) {
        logger.error('Failed to parse receipt from event', e as Error);
        return null;
    }
}

export function verifyReceiptEvent(event: SignedReceiptEvent): boolean {
    if (!verifyEvent(event)) {
        logger.warn('Receipt event signature verification failed');
        return false;
    }

    const action = kindToAction(event.kind);
    if (!action) {
        logger.warn('Unknown receipt event kind', event.kind);
        return false;
    }

    const receipt = extractReceiptFromEvent(event);
    if (!receipt) {
        return false;
    }

    if (receipt.action !== action) {
        logger.warn('Receipt action/kind mismatch');
        return false;
    }

    return true;
}

export interface ReceiptChain {
    matchId: string;
    receipts: SignedReceiptEvent[];
    currentState: MatchState;
    isValid: boolean;
    errors: string[];
}

export function buildReceiptChain(events: SignedReceiptEvent[]): ReceiptChain {
    const errors: string[] = [];
    const validReceipts: SignedReceiptEvent[] = [];

    const matchEvents = events.filter(e => {
        const action = kindToAction(e.kind);
        return action !== null;
    });

    matchEvents.sort((a, b) => a.created_at - b.created_at);

    if (matchEvents.length === 0) {
        return {
            matchId: '',
            receipts: [],
            currentState: 'draft',
            isValid: false,
            errors: ['No match events found'],
        };
    }

    const matchId = matchEvents[0].tags.find(t => t[0] === 'match')?.[1] ?? '';
    if (!matchId) {
        errors.push('No matchId in first event');
    }

    let previousEventId: string | undefined;

    for (const event of matchEvents) {
        if (!verifyReceiptEvent(event)) {
            errors.push(`Invalid receipt event: ${event.id}`);
            continue;
        }

        const receipt = extractReceiptFromEvent(event);
        if (!receipt) {
            errors.push(`Failed to extract receipt: ${event.id}`);
            continue;
        }

        if (matchId && receipt.matchId !== matchId) {
            errors.push(`MatchId mismatch in event: ${event.id}`);
            continue;
        }

        if (previousEventId) {
            const eTag = event.tags.find(t => t[0] === 'e' && t[1] === previousEventId && t[3] === 'chain');
            if (!eTag) {
                errors.push(`Missing chain reference to previous event: ${previousEventId}`);
                continue;
            }
        }

        validReceipts.push(event);
        previousEventId = event.id;
    }

    const chain: ReceiptChain = {
        matchId,
        receipts: validReceipts,
        currentState: deriveChainState({ matchId, receipts: validReceipts, currentState: 'draft', isValid: true, errors: [] }),
        isValid: errors.length === 0,
        errors,
    };

    return chain;
}

// TTL support: optional per-action TTL in metadata
export const DEFAULT_ACTION_TTL_MS: Record<MatchAction, number> = {
    publish: 0,
    match: 72 * 60 * 60 * 1000,
    respond: 72 * 60 * 60 * 1000,
    accept: 30 * 24 * 60 * 60 * 1000,
    withdraw: 0,
    complete: 0,
    cancel: 0,
};

function getActionTTL(action: MatchAction, metadata?: Record<string, unknown>): number {
    if (metadata?.ttl && typeof metadata.ttl === 'number') {
        return metadata.ttl;
    }
    return DEFAULT_ACTION_TTL_MS[action] ?? 0;
}

export function isMatchExpired(chain: ReceiptChain, now: number = Date.now()): boolean {
    if (chain.receipts.length === 0) return false;
    
    const lastReceipt = chain.receipts[chain.receipts.length - 1];
    const receiptData = extractReceiptFromEvent(lastReceipt);
    if (!receiptData) return false;

    const ttl = getActionTTL(receiptData.action, receiptData.metadata);
    if (ttl === 0) return false;

    const createdAt = lastReceipt.created_at * 1000;
    return now - createdAt > ttl;
}

export function getMatchExpiration(chain: ReceiptChain): number | null {
    if (chain.receipts.length === 0) return null;
    
    const lastReceipt = chain.receipts[chain.receipts.length - 1];
    const receiptData = extractReceiptFromEvent(lastReceipt);
    if (!receiptData) return null;

    const ttl = getActionTTL(receiptData.action, receiptData.metadata);
    if (ttl === 0) return null;

    return lastReceipt.created_at * 1000 + ttl;
}

export interface MatchContext {
    requestNote: Note;
    offerNote?: Note;
    matchScore?: number;
    matchDirection?: 'outgoing' | 'incoming';
}

export function createMatchId(requestNoteId: string, offerNoteId: string): string {
    const combined = [requestNoteId, offerNoteId].sort().join(':');
    const hash = sha256(utf8ToBytes(combined));
    return bytesToHex(hash.slice(0, 16));
}

export function exportReceiptChain(chain: ReceiptChain): string {
    return JSON.stringify({
        matchId: chain.matchId,
        currentState: chain.currentState,
        isValid: chain.isValid,
        errors: chain.errors,
        receipts: chain.receipts.map(r => ({
            id: r.id,
            kind: r.kind,
            pubkey: r.pubkey,
            created_at: r.created_at,
            tags: r.tags,
            content: r.content,
            sig: r.sig,
        })),
    }, null, 2);
}

export function importReceiptChain(json: string): ReceiptChain | null {
    try {
        const data = JSON.parse(json);
        return {
            matchId: data.matchId,
            receipts: data.receipts.map((r: any) => ({
                kind: r.kind,
                tags: r.tags,
                content: r.content,
                created_at: r.created_at,
                pubkey: r.pubkey,
                id: r.id,
                sig: r.sig,
            })),
            currentState: data.currentState,
            isValid: data.isValid,
            errors: data.errors ?? [],
        };
    } catch (e) {
        logger.error('Failed to import receipt chain', e as Error);
        return null;
    }
}