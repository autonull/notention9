import {z} from 'zod';
import type {AppSettings, Note} from '../types/index.js';

export const EXPORT_VERSION = 1;

const noteSchema = z.object({
    id: z.string().min(1),
    content: z.string(),
    title: z.string().optional(),
    tags: z.array(z.string()).optional(),
    properties: z.array(z.object({
        key: z.string(),
        operator: z.string(),
        values: z.array(z.string()),
    }).passthrough()).optional(),
}).passthrough();

export const exportEnvelopeSchema = z.object({
    version: z.number().int().positive(),
    timestamp: z.string(),
    notes: z.array(noteSchema),
    settings: z.object({
        nostr: z.object({privkey: z.string().nullish()}).passthrough().optional(),
    }).passthrough(),
}).passthrough();

export interface ExportEnvelope {
    version: number;
    timestamp: string;
    notes: Note[];
    settings: AppSettings;
}

export type ExportNote = Note;

export const singleNoteSchema = noteSchema;

const withoutPrivateKey = (settings: AppSettings): AppSettings => {
    const nostr = settings.nostr
        ? {...settings.nostr, privkey: null}
        : {privkey: null, relays: []};
    return {...settings, nostr};
};

export const buildExportEnvelope = (notes: Note[], settings: AppSettings): ExportEnvelope => ({
    version: EXPORT_VERSION,
    timestamp: new Date().toISOString(),
    notes,
    settings: withoutPrivateKey(settings),
});

export const buildSingleNoteExport = (note: Note): ExportNote => ({...note});

export class ExportValidationError extends Error {
    constructor(message: string, public readonly issues?: string[]) {
        super(message);
        this.name = 'ExportValidationError';
    }
}

export const readExportEnvelope = (input: unknown): ExportEnvelope => {
    const parsed = exportEnvelopeSchema.safeParse(input);
    if (!parsed.success) {
        throw new ExportValidationError(
            'This file is not a valid Notention backup.',
            parsed.error.issues.map(issue => `${issue.path.join('.') || 'file'}: ${issue.message}`)
        );
    }
    return parsed.data as unknown as ExportEnvelope;
};

export const readSingleNote = (input: unknown): ExportNote => {
    const parsed = singleNoteSchema.safeParse(input);
    if (!parsed.success) {
        throw new ExportValidationError(
            'This file is not a valid note export.',
            parsed.error.issues.map(issue => `${issue.path.join('.') || 'file'}: ${issue.message}`)
        );
    }
    return parsed.data as unknown as ExportNote;
};
