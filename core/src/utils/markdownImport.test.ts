import { describe, it, expect } from 'vitest';
import {
    parseMarkdownFile,
    importNotesFromMarkdown,
    parseNotentionMarkdown,
} from './markdownImport.js';
import { generateNotesMarkdown } from './markdownExport.js';
import type { Note } from '../types/index.js';

describe('markdownImport', () => {
    const sampleNote: Note = {
        id: 'test-123',
        title: 'Test Note',
        content: '<p>This is <strong>test</strong> content.</p>',
        tags: ['tag1', 'tag2'],
        properties: [
            { key: 'budget', operator: 'is', values: ['100'], unit: 'USD' },
            { key: 'schedule', operator: 'contains', values: ['weekend'] },
        ],
        createdAt: '2026-01-15T10:30:00.000Z',
        updatedAt: '2026-01-15T11:00:00.000Z',
        publishedAt: '2026-01-15T12:00:00.000Z',
        deadline: '2026-01-20T00:00:00.000Z',
        priority: 5,
        status: 'open',
        privacy: 'private',
        source: { type: 'user', identifier: 'test', timestamp: Date.now() },
    };

    describe('parseNotentionMarkdown', () => {
        it('parses a single note from markdown export format', () => {
            const markdown = generateNotesMarkdown([sampleNote]);
            const result = parseNotentionMarkdown(markdown);

            expect(result.errors).toHaveLength(0);
            expect(result.notes).toHaveLength(1);

            const note = result.notes[0];
            expect(note.title).toBe('Test Note');
            expect(note.content).toContain('This is test content');
            expect(note.tags).toEqual(['tag1', 'tag2']);
            expect(note.properties).toHaveLength(2);
            expect(note.properties[0].key).toBe('budget');
            expect(note.properties[0].values).toEqual(['100']);
            expect(note.properties[0].unit).toBe('USD');
        });

        it('handles multiple notes', () => {
            const note2: Note = {
                ...sampleNote,
                id: 'test-456',
                title: 'Second Note',
            };
            const markdown = generateNotesMarkdown([sampleNote, note2]);
            const result = parseNotentionMarkdown(markdown);

            expect(result.notes).toHaveLength(2);
            expect(result.notes[0].title).toBe('Test Note');
            expect(result.notes[1].title).toBe('Second Note');
        });

        it('handles notes without properties', () => {
            const noteNoProps: Note = {
                ...sampleNote,
                id: 'test-noprops',
                title: 'No Properties',
                properties: [],
            };
            const markdown = generateNotesMarkdown([noteNoProps]);
            const result = parseNotentionMarkdown(markdown);

            expect(result.notes).toHaveLength(1);
            expect(result.notes[0].properties).toHaveLength(0);
        });
    });

    describe('parseMarkdownFile (Obsidian-style)', () => {
        it('parses Obsidian frontmatter with tags', () => {
            const markdown = `---
title: Obsidian Note
tags: tag1, tag2
custom_field: value1, value2
---
# Content

This is the body content.`;

            const result = parseMarkdownFile(markdown);

            expect(result.errors).toHaveLength(0);
            expect(result.notes).toHaveLength(1);
            expect(result.notes[0].title).toBe('Obsidian Note');
            expect(result.notes[0].tags).toEqual(['tag1', 'tag2']);
            expect(result.notes[0].properties.some(p => p.key === 'custom_field')).toBe(true);
        });

        it('parses frontmatter with dates', () => {
            const markdown = `---
title: Dated Note
created: 2026-01-15T10:30:00.000Z
updated: 2026-01-15T11:00:00.000Z
published: 2026-01-15T12:00:00.000Z
deadline: 2026-01-20T00:00:00.000Z
priority: 3
status: committed
privacy: public
---
Content here.`;

            const result = parseMarkdownFile(markdown);

            expect(result.notes[0].title).toBe('Dated Note');
            expect(result.notes[0].createdAt).toBe(new Date('2026-01-15T10:30:00.000Z').getTime());
            expect(result.notes[0].priority).toBe(3);
            expect(result.notes[0].status).toBe('committed');
            expect(result.notes[0].privacy).toBe('public');
        });

        it('falls back to Notention format when no frontmatter', () => {
            const markdown = generateNotesMarkdown([sampleNote]);
            const result = parseMarkdownFile(markdown);

            expect(result.notes).toHaveLength(1);
            expect(result.notes[0].title).toBe('Test Note');
        });
    });

    describe('importNotesFromMarkdown', () => {
        it('converts parsed notes to full Note objects', () => {
            const markdown = generateNotesMarkdown([sampleNote]);
            const result = importNotesFromMarkdown(markdown);

            expect(result.errors).toHaveLength(0);
            expect(result.notes).toHaveLength(1);

            const note = result.notes[0];
            expect(note.id).toBeDefined();
            expect(note.title).toBe('Test Note');
            expect(note.createdAt).toBe('2026-01-15T10:30:00.000Z');
            expect(note.updatedAt).toBe('2026-01-15T11:00:00.000Z');
            expect(note.publishedAt).toBe('2026-01-15T12:00:00.000Z');
            expect(note.deadline).toBe('2026-01-20T00:00:00.000Z');
            expect(note.source.type).toBe('import');
            expect(note.source.identifier).toBe('markdown-import');
        });

        it('generates ID when not in metadata', () => {
            const markdown = `---
title: No ID Note
---
Content.`;

            const result = importNotesFromMarkdown(markdown);

            expect(result.notes[0].id).toBeDefined();
            expect(result.notes[0].id.length).toBeGreaterThan(0);
        });
    });

    describe('round-trip', () => {
        it('exports and imports with minimal data loss (HTML→plain text is expected)', () => {
            const originalNotes = [sampleNote];
            const markdown = generateNotesMarkdown(originalNotes);
            const result = importNotesFromMarkdown(markdown);

            expect(result.errors).toHaveLength(0);
            expect(result.notes).toHaveLength(1);

            const imported = result.notes[0];
            expect(imported.title).toBe(sampleNote.title);
            // Content: HTML is stripped to plain text in export (documented lossy edge)
            expect(imported.content).toBe('This is test content.');
            expect(imported.tags).toEqual(sampleNote.tags);
            expect(imported.properties).toEqual(sampleNote.properties);
            expect(imported.createdAt).toBe(sampleNote.createdAt);
            expect(imported.updatedAt).toBe(sampleNote.updatedAt);
            expect(imported.publishedAt).toBe(sampleNote.publishedAt);
            expect(imported.deadline).toBe(sampleNote.deadline);
            expect(imported.priority).toBe(sampleNote.priority);
            expect(imported.status).toBe(sampleNote.status);
            expect(imported.privacy).toBe(sampleNote.privacy);
        });

        it('handles empty notes array', () => {
            const markdown = generateNotesMarkdown([]);
            const result = importNotesFromMarkdown(markdown);

            expect(result.notes).toHaveLength(0);
        });
    });
});