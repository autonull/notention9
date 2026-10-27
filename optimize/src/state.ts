import type { Property } from '@notention/core';

export interface SemanticState {
    route: { view: string; hash: string; noteId: string | null };
    note: null | {
        id: string; title: string;
        properties: Property[];
        propertyIndex: Record<string, string[]>;
        tags: string[];
        privacy: 'private' | 'public';
        saveStatus: 'idle' | 'saving' | 'saved' | 'error';
        publishReadiness: { ready: boolean; blocking: string[] };
    };
    editor: { dirty: boolean; propertyDraft: null | { key?: string; operator?: string; value?: string } };
    review: Array<{ property: Property; confidence: number; presentation: 'silent' | 'suggest' | 'clarify' | 'block' }>;
    validation: { errors: string[]; missing: string[] };
    dialogs: Array<{ id: string; kind: 'confirm' | 'modal'; confirmLabel?: string }>;
    pendingConfirmations: Array<{ action: string; consequence: string }>;
}