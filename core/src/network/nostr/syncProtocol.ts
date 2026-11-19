import { finalizeEvent, getEventHash, verifyEvent, type NostrEvent } from 'nostr-tools/pure';
import { hexToBytes, bytesToHex } from '../../utils/encoding.js';
import { Logger } from '../../utils/logging.js';
import type { Note, Property } from '../../types/index.js';
import { KIND_SEMANTIC_NOTE, KIND_TEXT_NOTE } from './nostr.js';

const logger = Logger.create('SyncProtocol');

export const KIND_NOTE_REVISION = 35020;
export const KIND_NOTE_HEAD = 35021;

export interface NoteRevision {
    noteId: string;
    revision: number;
    revisionId: string;
    content: string;
    title: string;
    tags: string[];
    properties: Property[];
    updatedAt: string;
    author: string;
    prevRevisionId?: string;
    isDeleted: boolean;
    deletedAt?: string;
}

export interface NoteHead {
    noteId: string;
    revision: number;
    revisionId: string;
    updatedAt: string;
    author: string;
    isDeleted: boolean;
}

export interface SyncConflict {
    noteId: string;
    localRevision: NoteRevision;
    remoteRevision: NoteRevision;
    commonAncestor?: NoteRevision;
}

export interface SyncState {
    heads: Map<string, NoteHead>;
    revisions: Map<string, NoteRevision[]>;
    pendingConflicts: SyncConflict[];
}

interface RevisionInput {
    noteId: string;
    revision: number;
    content: string;
    title: string;
    tags: string[];
    properties: Property[];
    updatedAt: string;
    author: string;
    prevRevisionId?: string;
    isDeleted: boolean;
    deletedAt?: string;
}

export function createRevisionEvent(revision: RevisionInput, privkeyHex: string): NostrEvent {
    const tags: string[][] = [
        ['d', `revision_${revision.noteId}_${revision.revision}`],
        ['note', revision.noteId],
        ['revision', String(revision.revision)],
        ['updated', revision.updatedAt],
        ['t', 'note-revision'],
    ];

    if (revision.prevRevisionId) {
        tags.push(['e', revision.prevRevisionId]);
    }

    if (revision.isDeleted) {
        tags.push(['deleted', 'true']);
        if (revision.deletedAt) {
            tags.push(['deletedAt', revision.deletedAt]);
        }
    }

    const content = JSON.stringify({
        title: revision.title,
        content: revision.content,
        tags: revision.tags,
        properties: revision.properties,
    });

    const event: NostrEvent = {
        kind: KIND_NOTE_REVISION,
        tags,
        content,
        created_at: Math.floor(new Date(revision.updatedAt).getTime() / 1000),
        pubkey: '',
        id: '',
        sig: '',
    };

    event.id = getEventHash(event);
    return finalizeEvent(event, hexToBytes(privkeyHex));
}

export function createHeadEvent(head: NoteHead, privkeyHex: string): NostrEvent {
    const tags: string[][] = [
        ['d', `head_${head.noteId}`],
        ['note', head.noteId],
        ['revision', String(head.revision)],
        ['revisionId', head.revisionId],
        ['updated', head.updatedAt],
        ['t', 'note-head'],
    ];

    if (head.isDeleted) {
        tags.push(['deleted', 'true']);
    }

    const content = JSON.stringify({});

    const event: NostrEvent = {
        kind: KIND_NOTE_HEAD,
        tags,
        content,
        created_at: Math.floor(new Date(head.updatedAt).getTime() / 1000),
        pubkey: '',
        id: '',
        sig: '',
    };

    event.id = getEventHash(event);
    return finalizeEvent(event, hexToBytes(privkeyHex));
}

export function parseRevisionEvent(event: NostrEvent): NoteRevision | null {
    if (event.kind !== KIND_NOTE_REVISION) return null;
    if (!verifyEvent(event)) return null;

    const noteTag = event.tags.find(t => t[0] === 'note');
    const revisionTag = event.tags.find(t => t[0] === 'revision');
    const updatedTag = event.tags.find(t => t[0] === 'updated');
    const deletedTag = event.tags.find(t => t[0] === 'deleted');
    const deletedAtTag = event.tags.find(t => t[0] === 'deletedAt');
    const prevRevisionTag = event.tags.find(t => t[0] === 'e' && t[3] === 'rev');

    if (!noteTag || !revisionTag || !updatedTag) return null;

    let parsedContent: {
        title: string;
        content: string;
        tags: string[];
        properties: Property[];
    };

    try {
        parsedContent = JSON.parse(event.content);
    } catch {
        return null;
    }

    return {
        noteId: noteTag[1],
        revision: parseInt(revisionTag[1], 10),
        revisionId: event.id,
        content: parsedContent.content,
        title: parsedContent.title,
        tags: parsedContent.tags,
        properties: parsedContent.properties,
        updatedAt: updatedTag[1],
        author: event.pubkey,
        prevRevisionId: prevRevisionTag?.[1],
        isDeleted: deletedTag?.[1] === 'true',
        deletedAt: deletedAtTag?.[1],
    };
}

export function parseHeadEvent(event: NostrEvent): NoteHead | null {
    if (event.kind !== KIND_NOTE_HEAD) return null;
    if (!verifyEvent(event)) return null;

    const noteTag = event.tags.find(t => t[0] === 'note');
    const revisionTag = event.tags.find(t => t[0] === 'revision');
    const revisionIdTag = event.tags.find(t => t[0] === 'revisionId');
    const updatedTag = event.tags.find(t => t[0] === 'updated');
    const deletedTag = event.tags.find(t => t[0] === 'deleted');

    if (!noteTag || !revisionTag || !revisionIdTag || !updatedTag) return null;

    return {
        noteId: noteTag[1],
        revision: parseInt(revisionTag[1], 10),
        revisionId: revisionIdTag[1],
        updatedAt: updatedTag[1],
        author: event.pubkey,
        isDeleted: deletedTag?.[1] === 'true',
    };
}

export function noteToRevision(note: Note, author: string, prevRevisionId?: string): NoteRevision {
    return {
        noteId: note.id,
        revision: 0,
        revisionId: '',
        content: note.content,
        title: note.title,
        tags: note.tags,
        properties: note.properties,
        updatedAt: note.updatedAt,
        author,
        prevRevisionId,
        isDeleted: !!note.deletedAt,
        deletedAt: note.deletedAt,
    };
}

export function revisionToNote(revision: NoteRevision): Note {
    return {
        id: revision.noteId,
        title: revision.title,
        content: revision.content,
        tags: revision.tags,
        properties: revision.properties,
        createdAt: revision.updatedAt,
        updatedAt: revision.updatedAt,
        privacy: 'private',
        priority: 1,
        source: { type: 'import', identifier: 'nostr-sync', timestamp: Date.now() },
        deletedAt: revision.isDeleted ? revision.deletedAt : undefined,
    };
}

export class SyncEngine {
    private state: SyncState = {
        heads: new Map(),
        revisions: new Map(),
        pendingConflicts: [],
    };
    private privkeyHex: string;
    private pubkey: string;

    constructor(privkeyHex: string) {
        this.privkeyHex = privkeyHex;
        this.pubkey = '';
        try {
            const { getPublicKey } = require('nostr-tools/pure');
            this.pubkey = getPublicKey(hexToBytes(privkeyHex));
        } catch (e) {
            logger.error('Invalid private key for sync engine', e as Error);
        }
    }

    getPubkey(): string {
        return this.pubkey;
    }

    getState(): SyncState {
        return this.state;
    }

    getHead(noteId: string): NoteHead | undefined {
        return this.state.heads.get(noteId);
    }

    getRevisions(noteId: string): NoteRevision[] {
        return this.state.revisions.get(noteId) || [];
    }

    getPendingConflicts(): SyncConflict[] {
        return this.state.pendingConflicts;
    }

    applyLocalNote(note: Note): NoteRevision {
        const existingHead = this.state.heads.get(note.id);
        const revisionNumber = existingHead ? existingHead.revision + 1 : 1;
        const prevRevisionId = existingHead?.revisionId;

        const revisionInput = {
            noteId: note.id,
            revision: revisionNumber,
            content: note.content,
            title: note.title,
            tags: note.tags,
            properties: note.properties,
            updatedAt: note.updatedAt,
            author: this.pubkey,
            prevRevisionId,
            isDeleted: !!note.deletedAt,
            deletedAt: note.deletedAt,
        };

        const revisionEvent = createRevisionEvent(revisionInput, this.privkeyHex);

        const revision: NoteRevision = {
            noteId: note.id,
            revision: revisionNumber,
            revisionId: revisionEvent.id,
            content: note.content,
            title: note.title,
            tags: note.tags,
            properties: note.properties,
            updatedAt: note.updatedAt,
            author: this.pubkey,
            prevRevisionId,
            isDeleted: !!note.deletedAt,
            deletedAt: note.deletedAt,
        };

        this.storeRevision(revision);
        this.updateHead(revision);

        return revision;
    }

    applyRemoteRevision(revision: NoteRevision): { head: NoteHead; conflict?: SyncConflict } {
        const existingHead = this.state.heads.get(revision.noteId);
        const existingRevisions = this.state.revisions.get(revision.noteId) || [];

        if (!existingHead) {
            this.storeRevision(revision);
            this.updateHead(revision);
            return { head: this.state.heads.get(revision.noteId)! };
        }

        if (revision.revision <= existingHead.revision) {
            if (revision.revision === existingHead.revision && revision.revisionId !== existingHead.revisionId) {
                const conflict = this.createConflict(existingHead, revision);
                this.state.pendingConflicts.push(conflict);
                return { head: existingHead, conflict };
            }
            return { head: existingHead };
        }

        const isConcurrent = this.isConcurrentEdit(existingHead, revision, existingRevisions);

        if (isConcurrent) {
            const conflict = this.createConflictFromHead(existingHead, revision);
            this.state.pendingConflicts.push(conflict);
            return { head: existingHead, conflict };
        }

        this.storeRevision(revision);
        this.updateHead(revision);
        return { head: this.state.heads.get(revision.noteId)! };
    }

    private createConflict(localHead: NoteHead, remoteRevision: NoteRevision): SyncConflict {
        const localRevisions = this.state.revisions.get(localHead.noteId) || [];
        const localRevision = localRevisions.find(r => r.revision === localHead.revision);

        return {
            noteId: localHead.noteId,
            localRevision: localRevision!,
            remoteRevision,
            commonAncestor: this.findCommonAncestor(localRevision, remoteRevision, localRevisions),
        };
    }

    private createConflictFromHead(localHead: NoteHead, remoteRevision: NoteRevision): SyncConflict {
        const localRevisions = this.state.revisions.get(localHead.noteId) || [];
        const localRevision = localRevisions.find(r => r.revision === localHead.revision);

        return {
            noteId: localHead.noteId,
            localRevision: localRevision!,
            remoteRevision,
            commonAncestor: this.findCommonAncestor(localRevision, remoteRevision, localRevisions),
        };
    }

    private findCommonAncestor(localRev?: NoteRevision, remoteRev?: NoteRevision, localRevisions: NoteRevision[] = []): NoteRevision | undefined {
        if (!localRev || !remoteRev) return undefined;

        if (localRev.prevRevisionId === remoteRev.prevRevisionId) {
            return localRevisions.find(r => r.revision === localRev.revision - 1);
        }

        const localAncestors = new Set<string>();
        let current: NoteRevision | undefined = localRev;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (!current) break;
            localAncestors.add(current!.revisionId || '');
            if (!current!.prevRevisionId) break;
            const found = localRevisions.find(r => r.revisionId === current!.prevRevisionId);
            if (!found) break;
            current = found;
        }

        let remoteCurrent: NoteRevision | undefined = remoteRev;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (!remoteCurrent) break;
            if (localAncestors.has(remoteCurrent!.revisionId || '')) {
                const found = localRevisions.find(r => r.revisionId === remoteCurrent!.revisionId);
                if (found) return found;
            }
            if (!remoteCurrent!.prevRevisionId) break;
            const next = localRevisions.find(r => r.revisionId === remoteCurrent!.prevRevisionId);
            if (!next) break;
            remoteCurrent = next;
        }

        return undefined;
    }

    private isConcurrentEdit(localHead: NoteHead, remoteRevision: NoteRevision, localRevisions: NoteRevision[]): boolean {
        const localRevision = localRevisions.find(r => r.revision === localHead.revision);
        if (!localRevision) return false;

        const commonAncestor = this.findCommonAncestor(localRevision, remoteRevision, localRevisions);
        if (!commonAncestor) return true;

        return localRevision.revision > commonAncestor.revision &&
               remoteRevision.revision > commonAncestor.revision;
    }

    private storeRevision(revision: NoteRevision): void {
        const existing = this.state.revisions.get(revision.noteId) || [];
        const existingIndex = existing.findIndex(r => r.revision === revision.revision);

        if (existingIndex >= 0) {
            existing[existingIndex] = revision;
        } else {
            existing.push(revision);
        }

        existing.sort((a, b) => a.revision - b.revision);
        this.state.revisions.set(revision.noteId, existing);
    }

    private updateHead(revision: NoteRevision): void {
        const revisionEvent = createRevisionEvent(revision, this.privkeyHex);
        const head: NoteHead = {
            noteId: revision.noteId,
            revision: revision.revision,
            revisionId: revisionEvent.id,
            updatedAt: revision.updatedAt,
            author: revision.author,
            isDeleted: revision.isDeleted,
        };
        this.state.heads.set(revision.noteId, head);
    }

    resolveConflict(noteId: string, resolution: 'local' | 'remote' | 'merge'): NoteRevision {
        const conflictIndex = this.state.pendingConflicts.findIndex(c => c.noteId === noteId);
        if (conflictIndex === -1) {
            throw new Error(`No pending conflict for note ${noteId}`);
        }

        const conflict = this.state.pendingConflicts[conflictIndex];
        let resolvedRevision: NoteRevision;

        if (resolution === 'local') {
            resolvedRevision = conflict.localRevision;
        } else if (resolution === 'remote') {
            resolvedRevision = conflict.remoteRevision;
        } else {
            resolvedRevision = this.mergeRevisions(conflict.localRevision, conflict.remoteRevision, conflict.commonAncestor);
        }

        resolvedRevision.revision = (this.state.heads.get(noteId)?.revision || 0) + 1;
        resolvedRevision.prevRevisionId = this.state.heads.get(noteId)?.revisionId;
        resolvedRevision.updatedAt = new Date().toISOString();

        this.storeRevision(resolvedRevision);
        this.updateHead(resolvedRevision);

        this.state.pendingConflicts.splice(conflictIndex, 1);

        return resolvedRevision;
    }

    private mergeRevisions(local: NoteRevision, remote: NoteRevision, commonAncestor?: NoteRevision): NoteRevision {
        const mergedProperties = this.mergeProperties(local.properties, remote.properties, commonAncestor?.properties);

        return {
            noteId: local.noteId,
            revision: 0,
            revisionId: '',
            content: remote.content,
            title: remote.title,
            tags: [...new Set([...local.tags, ...remote.tags])],
            properties: mergedProperties,
            updatedAt: new Date().toISOString(),
            author: this.pubkey,
            prevRevisionId: undefined,
            isDeleted: local.isDeleted || remote.isDeleted,
            deletedAt: local.deletedAt || remote.deletedAt,
        };
    }

    private mergeProperties(local: Property[], remote: Property[], base?: Property[]): Property[] {
        const baseMap = new Map(base?.map(p => [p.key, p]) || []);
        const localMap = new Map(local.map(p => [p.key, p]));
        const remoteMap = new Map(remote.map(p => [p.key, p]));
        const allKeys = new Set([...localMap.keys(), ...remoteMap.keys(), ...baseMap.keys()]);
        const merged: Property[] = [];

        for (const key of allKeys) {
            const baseProp = baseMap.get(key);
            const localProp = localMap.get(key);
            const remoteProp = remoteMap.get(key);

            if (!localProp && remoteProp) {
                merged.push(remoteProp);
            } else if (localProp && !remoteProp) {
                merged.push(localProp);
            } else if (localProp && remoteProp) {
                if (JSON.stringify(localProp) === JSON.stringify(remoteProp)) {
                    merged.push(localProp);
                } else if (baseProp && JSON.stringify(localProp) === JSON.stringify(baseProp)) {
                    merged.push(remoteProp);
                } else if (baseProp && JSON.stringify(remoteProp) === JSON.stringify(baseProp)) {
                    merged.push(localProp);
                } else {
                    merged.push(remoteProp);
                }
            }
        }

        return merged;
    }

    createRevisionEvent(note: Note): NostrEvent {
        const revision = this.applyLocalNote(note);
        return createRevisionEvent(revision, this.privkeyHex);
    }

    createHeadEvent(noteId: string): NostrEvent | null {
        const head = this.state.heads.get(noteId);
        if (!head) return null;
        return createHeadEvent(head, this.privkeyHex);
    }

    exportState(): object {
        return {
            heads: Object.fromEntries(this.state.heads),
            revisions: Object.fromEntries(this.state.revisions),
            pendingConflicts: this.state.pendingConflicts,
        };
    }

    importState(data: { heads: Record<string, NoteHead>; revisions: Record<string, NoteRevision[]>; pendingConflicts: SyncConflict[] }): void {
        this.state.heads = new Map(Object.entries(data.heads));
        this.state.revisions = new Map(Object.entries(data.revisions));
        this.state.pendingConflicts = data.pendingConflicts || [];
    }
}

export function createSyncEngine(privkeyHex: string): SyncEngine {
    return new SyncEngine(privkeyHex);
}