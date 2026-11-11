/**
 * Browser-safe stub for ledger
 * Ledger is Node.js only (file system)
 */

export type LedgerEventType =
    | 'run:started'
    | 'run:completed'
    | 'run:failed'
    | 'case:started'
    | 'case:completed'
    | 'case:failed'
    | 'case:skipped'
    | 'strategy:resolved'
    | 'strategy:rendered'
    | 'verdict:computed'
    | 'gate:evaluated'
    | 'revision:created'
    | 'revision:evaluated'
    | 'revision:consented'
    | 'revision:activated'
    | 'revision:rolled-back'
    | 'revision:superseded'
    | 'revision:rejected'
    | 'consent:requested'
    | 'consent:granted'
    | 'consent:denied'
    | 'optimizer:cycle:started'
    | 'optimizer:cycle:completed'
    | 'optimizer:candidate:evaluated';

export type LedgerPayload = any;

export interface LedgerEvent {
    id: string;
    type: LedgerEventType;
    runId?: string;
    caseId?: string;
    revisionId?: string;
    evaluationId?: string;
    actor: 'system' | 'human' | 'model';
    userId?: string;
    modelId?: string;
    payload: LedgerPayload;
    timestamp: string;
    durationMs?: number;
    hash: string;
}

// Runtime exports for type compatibility (values are never used in browser)
export const LedgerEventType = {} as Record<LedgerEventType, LedgerEventType>;
export const LedgerPayload = {} as LedgerPayload;
export const LedgerEvent = {} as LedgerEvent;

export class Ledger {
    static getInstance(): never {
        throw new Error('Ledger is only available in Node.js');
    }

    append(): never {
        throw new Error('Ledger.append is only available in Node.js');
    }

    query(): never {
        throw new Error('Ledger.query is only available in Node.js');
    }

    getRunEvents(): never {
        throw new Error('Ledger.getRunEvents is only available in Node.js');
    }

    getRevisionHistory(): never {
        throw new Error('Ledger.getRevisionHistory is only available in Node.js');
    }

    exportRun(): never {
        throw new Error('Ledger.exportRun is only available in Node.js');
    }

    async prune(): Promise<never> {
        throw new Error('Ledger.prune is only available in Node.js');
    }
}

export function logEvent(): never {
    throw new Error('logEvent is only available in Node.js');
}

export function queryLedger(): never {
    throw new Error('queryLedger is only available in Node.js');
}

export function getRunEvents(): never {
    throw new Error('getRunEvents is only available in Node.js');
}

export function exportRun(): never {
    throw new Error('exportRun is only available in Node.js');
}

export async function pruneLedger(): Promise<never> {
    throw new Error('pruneLedger is only available in Node.js');
}

const browserLedgerInstance = new Ledger();

export function getLedger(): Ledger {
    return browserLedgerInstance;
}

export function resetLedger(): void {
    // No-op in browser: the ledger holds no state outside Node.js.
}

// Match act step - browser-safe no-ops (ledger is Node.js only)
export function logMatchAccepted(
    _requestNoteId: string,
    _offerNoteId: string,
    _responseNoteId: string,
    _score: number,
    _userId?: string
): void {
    console.debug('[ledger] match:accepted', { requestNoteId: _requestNoteId, offerNoteId: _offerNoteId, responseNoteId: _responseNoteId, score: _score, userId: _userId });
}

export function logMatchWithdrawn(
    _responseNoteId: string,
    _requestNoteId: string,
    _offerNoteId: string,
    _userId?: string
): void {
    console.debug('[ledger] match:withdrawn', { responseNoteId: _responseNoteId, requestNoteId: _requestNoteId, offerNoteId: _offerNoteId, userId: _userId });
}

export function logMatchRejected(
    _requestNoteId: string,
    _offerNoteId: string,
    _userId?: string
): void {
    console.debug('[ledger] match:rejected', { requestNoteId: _requestNoteId, offerNoteId: _offerNoteId, userId: _userId });
}