import { describe, it, expect, beforeEach } from 'vitest';
import {
    MATCH_KINDS,
    actionToKind,
    kindToAction,
    createReceipt,
    extractReceiptFromEvent,
    verifyReceiptEvent,
    buildReceiptChain,
    deriveChainState,
    deriveNoteMatchStates,
    isMatchExpired,
    getMatchExpiration,
    createMatchId,
    exportReceiptChain,
    importReceiptChain,
    DEFAULT_ACTION_TTL_MS,
    type MatchState,
    type MatchAction,
    type SignedReceiptEvent,
    type ReceiptChain,
} from './matchProtocol.js';
import { generatePrivateKey, getPublicKey } from '../network/nostr/protocol.js';
import { hexToBytes } from '../utils/encoding.js';

describe('MatchProtocol - Action/Kind Mapping', () => {
    describe('actionToKind / kindToAction', () => {
        it('should map actions to kinds and back', () => {
            const actions: MatchAction[] = ['publish', 'match', 'respond', 'accept', 'withdraw', 'complete', 'cancel'];
            
            for (const action of actions) {
                const kind = actionToKind(action);
                expect(kindToAction(kind)).toBe(action);
            }
        });

        it('should use correct Nostr event kinds', () => {
            expect(actionToKind('publish')).toBe(35100);
            expect(actionToKind('match')).toBe(35101);
            expect(actionToKind('respond')).toBe(35102);
            expect(actionToKind('accept')).toBe(35103);
            expect(actionToKind('withdraw')).toBe(35104);
            expect(actionToKind('complete')).toBe(35105);
            expect(actionToKind('cancel')).toBe(35106);
        });

        it('should return null for unknown kinds', () => {
            expect(kindToAction(99999)).toBeNull();
        });
    });
});

describe('MatchProtocol - Receipt Creation', () => {
    let actorPrivkey: string;
    let actorPubkey: string;
    let targetPrivkey: string;
    let targetPubkey: string;

    beforeEach(() => {
        actorPrivkey = generatePrivateKey();
        actorPubkey = getPublicKey(hexToBytes(actorPrivkey));
        targetPrivkey = generatePrivateKey();
        targetPubkey = getPublicKey(hexToBytes(targetPrivkey));
    });

    it('should create publish receipt', () => {
        const receipt = createReceipt(
            'publish',
            'note-123',
            'match-456',
            actorPrivkey,
            undefined,
            undefined,
            { source: 'user' }
        );

        expect(receipt.kind).toBe(MATCH_KINDS.PUBLISH);
        expect(receipt.pubkey).toBe(actorPubkey);
        expect(receipt.tags.some(t => t[0] === 'match' && t[1] === 'match-456')).toBe(true);
        expect(receipt.tags.some(t => t[0] === 'note' && t[1] === 'note-123')).toBe(true);
        expect(receipt.tags.some(t => t[0] === 'action' && t[1] === 'publish')).toBe(true);
        expect(receipt.tags.some(t => t[0] === 'actor' && t[1] === actorPubkey)).toBe(true);
        expect(receipt.tags.some(t => t[0] === 'metadata')).toBe(true);
    });

    it('should create match receipt with target', () => {
        const receipt = createReceipt(
            'match',
            'note-123',
            'match-456',
            actorPrivkey,
            targetPubkey,
            'prev-event-id'
        );

        expect(receipt.kind).toBe(MATCH_KINDS.MATCH);
        expect(receipt.tags.some(t => t[0] === 'target' && t[1] === targetPubkey)).toBe(true);
        expect(receipt.tags.some(t => t[0] === 'e' && t[1] === 'prev-event-id' && t[3] === 'chain')).toBe(true);
    });

    it('should create accept receipt', () => {
        const receipt = createReceipt(
            'accept',
            'note-123',
            'match-456',
            actorPrivkey,
            targetPubkey,
            'prev-event-id'
        );

        expect(receipt.kind).toBe(MATCH_KINDS.ACCEPT);
    });

    it('should create withdraw receipt', () => {
        const receipt = createReceipt(
            'withdraw',
            'note-123',
            'match-456',
            actorPrivkey
        );

        expect(receipt.kind).toBe(MATCH_KINDS.WITHDRAW);
    });

    it('should create complete receipt', () => {
        const receipt = createReceipt(
            'complete',
            'note-123',
            'match-456',
            actorPrivkey
        );

        expect(receipt.kind).toBe(MATCH_KINDS.COMPLETE);
    });

    it('should create cancel receipt', () => {
        const receipt = createReceipt(
            'cancel',
            'note-123',
            'match-456',
            actorPrivkey
        );

        expect(receipt.kind).toBe(MATCH_KINDS.CANCEL);
    });

    it('should include action in receipt content (not state/ttl)', () => {
        const receipt = createReceipt(
            'publish',
            'note-123',
            'match-456',
            actorPrivkey
        );

        const content = JSON.parse(receipt.content);
        expect(content.action).toBe('publish');
        expect(content.matchId).toBe('match-456');
        expect(content.noteId).toBe('note-123');
        expect(content.actorPubkey).toBe(actorPubkey);
        expect(content.state).toBeUndefined();
        expect(content.ttl).toBeUndefined();
    });
});

describe('MatchProtocol - Receipt Extraction', () => {
    let actorPrivkey: string;
    let actorPubkey: string;
    let targetPubkey: string;

    beforeEach(() => {
        actorPrivkey = generatePrivateKey();
        actorPubkey = getPublicKey(hexToBytes(actorPrivkey));
        targetPubkey = getPublicKey(hexToBytes(generatePrivateKey()));
    });

    it('should extract valid receipt from event', () => {
        const receipt = createReceipt(
            'publish',
            'note-123',
            'match-456',
            actorPrivkey,
            targetPubkey
        );

        const extracted = extractReceiptFromEvent(receipt);
        
        expect(extracted).not.toBeNull();
        expect(extracted!.action).toBe('publish');
        expect(extracted!.matchId).toBe('match-456');
        expect(extracted!.noteId).toBe('note-123');
        expect(extracted!.actorPubkey).toBe(actorPubkey);
        expect(extracted!.targetPubkey).toBe(targetPubkey);
    });

    it('should reject event with missing required fields', () => {
        const receipt = createReceipt(
            'publish',
            'note-123',
            'match-456',
            actorPrivkey
        );
        
        // Remove required tag
        const tampered = { 
            ...receipt, 
            tags: receipt.tags.filter(t => t[0] !== 'note') 
        };
        
        expect(extractReceiptFromEvent(tampered)).toBeNull();
    });

    it('should reject event with mismatched d-tag', () => {
        const receipt = createReceipt(
            'publish',
            'note-123',
            'match-456',
            actorPrivkey
        );
        
        // Tamper with d-tag
        const tampered = { 
            ...receipt, 
            tags: receipt.tags.map(t => t[0] === 'd' ? ['d', 'invalid_match'] : t) 
        };
        
        expect(extractReceiptFromEvent(tampered)).toBeNull();
    });

    it('should reject event with mismatched matchId', () => {
        const receipt = createReceipt(
            'publish',
            'note-123',
            'match-456',
            actorPrivkey
        );
        
        // Tamper with match tag
        const tampered = { 
            ...receipt, 
            tags: receipt.tags.map(t => t[0] === 'match' ? ['match', 'different-match'] : t) 
        };
        
        expect(extractReceiptFromEvent(tampered)).toBeNull();
    });
});

describe('MatchProtocol - Receipt Verification', () => {
    let actorPrivkey: string;

    beforeEach(() => {
        actorPrivkey = generatePrivateKey();
    });

    it('should verify valid receipt event', () => {
        const receipt = createReceipt(
            'publish',
            'note-123',
            'match-456',
            actorPrivkey
        );

        expect(verifyReceiptEvent(receipt)).toBe(true);
    });

    it('should reject event with unknown kind', () => {
        const receipt = createReceipt(
            'publish',
            'note-123',
            'match-456',
            actorPrivkey
        );
        
        const tampered = { ...receipt, kind: 99999 };
        
        expect(verifyReceiptEvent(tampered)).toBe(false);
    });
});

describe('MatchProtocol - Receipt Chain', () => {
    let requesterPrivkey: string;
    let requesterPubkey: string;
    let offererPrivkey: string;
    let offererPubkey: string;

    beforeEach(() => {
        requesterPrivkey = generatePrivateKey();
        requesterPubkey = getPublicKey(hexToBytes(requesterPrivkey));
        offererPrivkey = generatePrivateKey();
        offererPubkey = getPublicKey(hexToBytes(offererPrivkey));
    });

    it('should build valid chain for full flow', () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        const matchReceipt = createReceipt('match', noteId, matchId, offererPrivkey, requesterPubkey, publishReceipt.id);
        const respondReceipt = createReceipt('respond', noteId, matchId, requesterPrivkey, offererPubkey, matchReceipt.id);
        const acceptReceipt = createReceipt('accept', noteId, matchId, offererPrivkey, requesterPubkey, respondReceipt.id);

        const chain = buildReceiptChain([publishReceipt, matchReceipt, respondReceipt, acceptReceipt]);

        expect(chain.matchId).toBe(matchId);
        expect(chain.receipts).toHaveLength(4);
        expect(chain.currentState).toBe('accepted');
        expect(chain.isValid).toBe(true);
        expect(chain.errors).toHaveLength(0);
    });

    it('should build valid chain for publish → match → withdraw', () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        const matchReceipt = createReceipt('match', noteId, matchId, offererPrivkey, requesterPubkey, publishReceipt.id);
        const withdrawReceipt = createReceipt('withdraw', noteId, matchId, offererPrivkey, requesterPubkey, matchReceipt.id);

        const chain = buildReceiptChain([publishReceipt, matchReceipt, withdrawReceipt]);

        expect(chain.receipts).toHaveLength(3);
        expect(chain.currentState).toBe('withdrawn');
        expect(chain.isValid).toBe(true);
    });

    it('should build valid chain for publish → cancel', () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        const cancelReceipt = createReceipt('cancel', noteId, matchId, requesterPrivkey, undefined, publishReceipt.id);

        const chain = buildReceiptChain([publishReceipt, cancelReceipt]);

        expect(chain.receipts).toHaveLength(2);
        expect(chain.currentState).toBe('cancelled');
        expect(chain.isValid).toBe(true);
    });

    it('should reject missing chain reference', () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        const matchReceipt = createReceipt('match', noteId, matchId, offererPrivkey, requesterPubkey); // Missing previous event reference

        const chain = buildReceiptChain([publishReceipt, matchReceipt]);

        expect(chain.receipts).toHaveLength(1); // Only publish accepted
        expect(chain.isValid).toBe(false);
        expect(chain.errors.some(e => e.includes('Missing chain reference'))).toBe(true);
    });

    it('should reject mismatched matchId', () => {
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, 'match-1', requesterPrivkey);
        const matchReceipt = createReceipt('match', noteId, 'match-2', offererPrivkey, requesterPubkey, publishReceipt.id);

        const chain = buildReceiptChain([publishReceipt, matchReceipt]);

        expect(chain.isValid).toBe(false);
        expect(chain.errors.some(e => e.includes('MatchId mismatch'))).toBe(true);
    });

    it('should sort events by timestamp', async () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        // Create in correct order with delays to ensure different created_at (seconds)
        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        await new Promise(r => setTimeout(r, 1100));
        const matchReceipt = createReceipt('match', noteId, matchId, offererPrivkey, requesterPubkey, publishReceipt.id);
        await new Promise(r => setTimeout(r, 1100));
        const respondReceipt = createReceipt('respond', noteId, matchId, requesterPrivkey, offererPubkey, matchReceipt.id);
        await new Promise(r => setTimeout(r, 1100));
        const acceptReceipt = createReceipt('accept', noteId, matchId, offererPrivkey, requesterPubkey, respondReceipt.id);

        // Pass in reverse order to test sorting
        const chain = buildReceiptChain([acceptReceipt, respondReceipt, matchReceipt, publishReceipt]);

        // Should be sorted correctly by timestamp and chain references
        expect(chain.receipts).toHaveLength(4);
        expect(chain.receipts[0].kind).toBe(MATCH_KINDS.PUBLISH);
        expect(chain.receipts[1].kind).toBe(MATCH_KINDS.MATCH);
        expect(chain.receipts[2].kind).toBe(MATCH_KINDS.RESPOND);
        expect(chain.receipts[3].kind).toBe(MATCH_KINDS.ACCEPT);
    });

    it('should return empty chain for no match events', () => {
        const chain = buildReceiptChain([]);
        
        expect(chain.matchId).toBe('');
        expect(chain.receipts).toHaveLength(0);
        expect(chain.currentState).toBe('draft');
        expect(chain.isValid).toBe(false);
        expect(chain.errors).toContain('No match events found');
    });
});

describe('MatchProtocol - Derived State', () => {
    let requesterPrivkey: string;
    let requesterPubkey: string;
    let offererPrivkey: string;
    let offererPubkey: string;

    beforeEach(() => {
        requesterPrivkey = generatePrivateKey();
        requesterPubkey = getPublicKey(hexToBytes(requesterPrivkey));
        offererPrivkey = generatePrivateKey();
        offererPubkey = getPublicKey(hexToBytes(offererPrivkey));
    });

    it('should derive state from chain receipts', () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        const chain1 = buildReceiptChain([publishReceipt]);
        expect(deriveChainState(chain1)).toBe('published');

        const matchReceipt = createReceipt('match', noteId, matchId, offererPrivkey, requesterPubkey, publishReceipt.id);
        const chain2 = buildReceiptChain([publishReceipt, matchReceipt]);
        expect(deriveChainState(chain2)).toBe('matched');

        const respondReceipt = createReceipt('respond', noteId, matchId, requesterPrivkey, offererPubkey, matchReceipt.id);
        const chain3 = buildReceiptChain([publishReceipt, matchReceipt, respondReceipt]);
        expect(deriveChainState(chain3)).toBe('responded');

        const acceptReceipt = createReceipt('accept', noteId, matchId, offererPrivkey, requesterPubkey, respondReceipt.id);
        const chain4 = buildReceiptChain([publishReceipt, matchReceipt, respondReceipt, acceptReceipt]);
        expect(deriveChainState(chain4)).toBe('accepted');

        const completeReceipt = createReceipt('complete', noteId, matchId, requesterPrivkey, offererPubkey, acceptReceipt.id);
        const chain5 = buildReceiptChain([publishReceipt, matchReceipt, respondReceipt, acceptReceipt, completeReceipt]);
        expect(deriveChainState(chain5)).toBe('completed');

        const withdrawReceipt = createReceipt('withdraw', noteId, matchId, offererPrivkey, requesterPubkey, matchReceipt.id);
        const chain6 = buildReceiptChain([publishReceipt, matchReceipt, withdrawReceipt]);
        expect(deriveChainState(chain6)).toBe('withdrawn');

        const cancelReceipt = createReceipt('cancel', noteId, matchId, requesterPrivkey, undefined, publishReceipt.id);
        const chain7 = buildReceiptChain([publishReceipt, cancelReceipt]);
        expect(deriveChainState(chain7)).toBe('cancelled');
    });

    it('should derive highest priority state per matchId', () => {
        const matchId1 = 'match-1';
        const matchId2 = 'match-2';
        const noteId = 'note-456';

        const publishReceipt1 = createReceipt('publish', noteId, matchId1, requesterPrivkey);
        const matchReceipt1 = createReceipt('match', noteId, matchId1, offererPrivkey, requesterPubkey, publishReceipt1.id);
        const acceptReceipt1 = createReceipt('accept', noteId, matchId1, offererPrivkey, requesterPubkey, matchReceipt1.id);

        const publishReceipt2 = createReceipt('publish', noteId, matchId2, requesterPrivkey);
        const matchReceipt2 = createReceipt('match', noteId, matchId2, offererPrivkey, requesterPubkey, publishReceipt2.id);
        const respondReceipt2 = createReceipt('respond', noteId, matchId2, requesterPrivkey, offererPubkey, matchReceipt2.id);

        const chain1 = buildReceiptChain([publishReceipt1, matchReceipt1, acceptReceipt1]);
        const chain2 = buildReceiptChain([publishReceipt2, matchReceipt2, respondReceipt2]);

        const states = deriveNoteMatchStates([chain1, chain2]);

        expect(states.get(matchId1)).toBe('accepted');
        expect(states.get(matchId2)).toBe('responded');
    });
});

describe('MatchProtocol - Expiration', () => {
    let requesterPrivkey: string;
    let requesterPubkey: string;
    let offererPrivkey: string;
    let offererPubkey: string;

    beforeEach(() => {
        requesterPrivkey = generatePrivateKey();
        requesterPubkey = getPublicKey(hexToBytes(requesterPrivkey));
        offererPrivkey = generatePrivateKey();
        offererPubkey = getPublicKey(hexToBytes(offererPrivkey));
    });

    it('should not expire terminal states', () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        const matchReceipt = createReceipt('match', noteId, matchId, offererPrivkey, requesterPubkey, publishReceipt.id);
        const respondReceipt = createReceipt('respond', noteId, matchId, requesterPrivkey, offererPubkey, matchReceipt.id);
        const acceptReceipt = createReceipt('accept', noteId, matchId, offererPrivkey, requesterPubkey, respondReceipt.id);
        const completeReceipt = createReceipt('complete', noteId, matchId, requesterPrivkey, offererPubkey, acceptReceipt.id);

        const chain = buildReceiptChain([publishReceipt, matchReceipt, respondReceipt, acceptReceipt, completeReceipt]);
        
        expect(isMatchExpired(chain)).toBe(false);
        expect(getMatchExpiration(chain)).toBeNull();
    });

    it('should not expire withdrawn or cancelled states', () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        const matchReceipt = createReceipt('match', noteId, matchId, offererPrivkey, requesterPubkey, publishReceipt.id);
        const withdrawReceipt = createReceipt('withdraw', noteId, matchId, offererPrivkey, requesterPubkey, matchReceipt.id);

        const chain = buildReceiptChain([publishReceipt, matchReceipt, withdrawReceipt]);
        
        expect(isMatchExpired(chain)).toBe(false);
        expect(getMatchExpiration(chain)).toBeNull();
    });

    it('should expire active states after TTL', () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        const matchReceipt = createReceipt('match', noteId, matchId, offererPrivkey, requesterPubkey, publishReceipt.id);
        // Manually set old timestamp on match receipt
        matchReceipt.created_at = Math.floor((Date.now() - 80 * 60 * 60 * 1000) / 1000); // 80 hours ago (TTL is 72h)

        const chain = buildReceiptChain([publishReceipt, matchReceipt]);
        
        expect(isMatchExpired(chain)).toBe(true);
    });

    it('should not expire within TTL', () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        const matchReceipt = createReceipt('match', noteId, matchId, offererPrivkey, requesterPubkey, publishReceipt.id);

        const chain = buildReceiptChain([publishReceipt, matchReceipt]);
        
        expect(isMatchExpired(chain)).toBe(false);
        const expiration = getMatchExpiration(chain);
        expect(expiration).not.toBeNull();
        // match TTL is 72h
        expect(expiration! - Date.now()).toBeLessThan(DEFAULT_ACTION_TTL_MS.match + 1000);
        expect(expiration! - Date.now()).toBeGreaterThan(DEFAULT_ACTION_TTL_MS.match - 1000);
    });

    it('should respect custom TTL in metadata', () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        const matchReceipt = createReceipt('match', noteId, matchId, offererPrivkey, requesterPubkey, publishReceipt.id, { ttl: 1000 }); // 1 second TTL

        const chain = buildReceiptChain([publishReceipt, matchReceipt]);
        
        expect(isMatchExpired(chain)).toBe(false); // Just created, not expired yet
        
        // Fast-forward time
        const expiredChain = buildReceiptChain([
            { ...publishReceipt, created_at: Math.floor((Date.now() - 2000) / 1000) },
            { ...matchReceipt, created_at: Math.floor((Date.now() - 2000) / 1000) }
        ]);
        
        expect(isMatchExpired(expiredChain)).toBe(true);
    });
});

describe('MatchProtocol - Match ID', () => {
    it('should create consistent match ID from two note IDs', () => {
        const id1 = createMatchId('note-a', 'note-b');
        const id2 = createMatchId('note-b', 'note-a');
        
        expect(id1).toBe(id2);
        expect(id1.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should create different IDs for different note pairs', () => {
        const id1 = createMatchId('note-a', 'note-b');
        const id2 = createMatchId('note-a', 'note-c');
        
        expect(id1).not.toBe(id2);
    });
});

describe('MatchProtocol - Export/Import', () => {
    let requesterPrivkey: string;
    let offererPrivkey: string;

    beforeEach(() => {
        requesterPrivkey = generatePrivateKey();
        offererPrivkey = generatePrivateKey();
    });

    it('should export and import receipt chain', () => {
        const matchId = 'match-test-123';
        const noteId = 'note-456';

        const publishReceipt = createReceipt('publish', noteId, matchId, requesterPrivkey);
        const matchReceipt = createReceipt('match', noteId, matchId, offererPrivkey, undefined, publishReceipt.id);

        const originalChain = buildReceiptChain([publishReceipt, matchReceipt]);
        
        const exported = exportReceiptChain(originalChain);
        const importedChain = importReceiptChain(exported);

        expect(importedChain).not.toBeNull();
        expect(importedChain!.matchId).toBe(originalChain.matchId);
        expect(importedChain!.currentState).toBe(originalChain.currentState);
        expect(importedChain!.isValid).toBe(originalChain.isValid);
        expect(importedChain!.receipts).toHaveLength(originalChain.receipts.length);
        expect(importedChain!.receipts[0].id).toBe(originalChain.receipts[0].id);
        expect(importedChain!.receipts[1].id).toBe(originalChain.receipts[1].id);
    });

    it('should return null for invalid JSON', () => {
        const imported = importReceiptChain('invalid json');
        expect(imported).toBeNull();
    });

    it('should return null for missing required fields', () => {
        const imported = importReceiptChain('{"matchId": "test"}');
        expect(imported).toBeNull();
    });
});