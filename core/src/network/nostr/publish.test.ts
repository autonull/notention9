import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {Note} from '../../types/index.js';
import {buildDeletionRequest, KIND_DELETION, KIND_SEMANTIC_NOTE, KIND_TEXT_NOTE, pool, publishNoteToNostr} from './nostr.js';

const makeNote = (overrides: Partial<Note> = {}): Note => ({
    id: 'note-1',
    title: 'Test note',
    content: 'hello',
    tags: [],
    properties: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: {type: 'user', identifier: 'test', timestamp: 0},
    privacy: 'public',
    priority: 1,
    ...overrides,
});

function createSigner() {
    const payloads: Array<{kind: number; tags: string[][]; content: string; created_at: number}> = [];
    return {
        payloads,
        signer: {
            signEvent: async (event: {kind: number; tags: string[][]; content: string; created_at: number}) => {
                payloads.push(event);
                return {...event, id: `event-${payloads.length}`, pubkey: 'pubkey-hex', sig: 'sig'};
            },
        },
    };
}

describe('buildDeletionRequest', () => {
    it('returns null for a note that was never published', () => {
        expect(buildDeletionRequest(makeNote())).toBeNull();
    });

    it('requests deletion of a text note by event id', () => {
        const request = buildDeletionRequest(makeNote({nostrEventId: 'event-1'}));

        expect(request?.kind).toBe(KIND_DELETION);
        expect(request?.tags).toContainEqual(['e', 'event-1']);
        expect(request?.tags).toContainEqual(['k', String(KIND_TEXT_NOTE)]);
        expect(request?.tags.some(tag => tag[0] === 'a')).toBe(false);
    });

    it('adds an addressable tag for semantic notes with a known author', () => {
        const note = makeNote({
            nostrEventId: 'event-1',
            author: 'author-hex',
            properties: [{key: 'need', operator: 'is', values: ['x']}],
        });
        const request = buildDeletionRequest(note);

        expect(request?.tags).toContainEqual(['k', String(KIND_SEMANTIC_NOTE)]);
        expect(request?.tags).toContainEqual(['a', `${KIND_SEMANTIC_NOTE}:author-hex:note-1`]);
    });

    it('omits the addressable tag when the author is unknown', () => {
        const note = makeNote({
            nostrEventId: 'event-1',
            properties: [{key: 'need', operator: 'is', values: ['x']}],
        });

        expect(buildDeletionRequest(note)?.tags.some(tag => tag[0] === 'a')).toBe(false);
    });
});

describe('publishNoteToNostr', () => {
    beforeEach(() => {
        vi.spyOn(pool, 'publish').mockReturnValue([Promise.resolve('ok')]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('leaves the body untouched by default', async () => {
        const {signer, payloads} = createSigner();
        const note = makeNote({content: 'write a@b.com'});

        await publishNoteToNostr(note, 'priv', undefined, undefined, 'public', signer);

        expect(payloads[0].content).toBe('write a@b.com');
    });

    it('redacts PII on request', async () => {
        const {signer, payloads} = createSigner();
        const note = makeNote({content: 'write a@b.com or call +1 415 555 0100'});

        await publishNoteToNostr(note, 'priv', undefined, undefined, 'public', signer, {redactPII: true});

        expect(payloads[0].content).toContain('[EMAIL]');
        expect(payloads[0].content).toContain('[PHONE]');
        expect(payloads[0].content).not.toContain('a@b.com');
    });

    it('records the event id and author on the note', async () => {
        const {signer} = createSigner();
        const note = makeNote();

        await publishNoteToNostr(note, 'priv', undefined, undefined, 'public', signer);

        expect(note.nostrEventId).toBe('event-1');
        expect(note.author).toBe('pubkey-hex');
        expect(note.publishedAt).toBeDefined();
    });
});
