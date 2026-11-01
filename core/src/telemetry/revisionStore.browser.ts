/**
 * Browser-safe stub for revisionStore
 * RevisionStore is Node.js only (file system)
 */

export interface Revision {
    id: string;
    seamRole: string;
    strategy: StrategyArtifact;
    author: 'human' | 'model';
    model?: string;
    promptHash?: string;
    parentRevisionId?: string;
    evaluationId?: string;
    verdict?: 'pass' | 'fail' | 'inconclusive';
    status: RevisionStatus;
    consentedBy?: string;
    consentedAt?: string;
    activatedAt?: string;
    rolledBackAt?: string;
    rollbackReason?: string;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
}

export interface StrategyArtifact {
    id: string;
    seamId: string;
    version: string;
    params: Record<string, unknown>;
    code?: string;
    componentType?: string;
}

export type RevisionStatus =
    | 'draft'
    | 'evaluating'
    | 'evaluated'
    | 'awaiting-consent'
    | 'consented'
    | 'active'
    | 'rolled-back'
    | 'superseded'
    | 'rejected';

export interface RevisionStoreConfig {
    maxRevisionsPerSeam?: number;
}

export class RevisionStore {
    constructor() {
        throw new Error('RevisionStore is only available in Node.js');
    }

    async init(): Promise<never> {
        throw new Error('RevisionStore.init is only available in Node.js');
    }

    async create(): Promise<never> {
        throw new Error('RevisionStore.create is only available in Node.js');
    }

    async get(): Promise<never> {
        throw new Error('RevisionStore.get is only available in Node.js');
    }

    async getBySeam(): Promise<never> {
        throw new Error('RevisionStore.getBySeam is only available in Node.js');
    }

    async getByStatus(): Promise<never> {
        throw new Error('RevisionStore.getByStatus is only available in Node.js');
    }

    async getActive(): Promise<never> {
        throw new Error('RevisionStore.getActive is only available in Node.js');
    }

    async updateStatus(): Promise<never> {
        throw new Error('RevisionStore.updateStatus is only available in Node.js');
    }

    async activate(): Promise<never> {
        throw new Error('RevisionStore.activate is only available in Node.js');
    }

    async requestConsent(): Promise<never> {
        throw new Error('RevisionStore.requestConsent is only available in Node.js');
    }

    async grantConsent(): Promise<never> {
        throw new Error('RevisionStore.grantConsent is only available in Node.js');
    }

    async denyConsent(): Promise<never> {
        throw new Error('RevisionStore.denyConsent is only available in Node.js');
    }

    async linkEvaluation(): Promise<never> {
        throw new Error('RevisionStore.linkEvaluation is only available in Node.js');
    }

    async search(): Promise<never> {
        throw new Error('RevisionStore.search is only available in Node.js');
    }

    async count(): Promise<never> {
        throw new Error('RevisionStore.count is only available in Node.js');
    }
}

export function getRevisionStore(): never {
    throw new Error('getRevisionStore is only available in Node.js');
}

export function resetRevisionStore(): never {
    throw new Error('resetRevisionStore is only available in Node.js');
}