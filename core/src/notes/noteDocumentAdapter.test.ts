import { describe, it, expect } from 'vitest';
import type { NoteDocument, Block, PropertyRef } from '../types/noteDocument.js';
import type { Property } from '../types/domain.js';
import {
    noteDocumentToPM,
    pmToNoteDocument,
    htmlToNoteDocument,
    noteDocumentToHtml,
} from './noteDocumentAdapter.js';
import { createNote } from './notes.js';
import { createNoteDocument, isValidNoteDocument } from '../types/noteDocument.js';

const sampleNoteDocument: NoteDocument = createNoteDocument({
    blocks: [
        { id: 'block-1', type: 'heading', level: 1, content: [{ text: 'My Note' }] },
        { id: 'block-2', type: 'paragraph', content: [{ text: 'This is a paragraph with ' }, { text: 'bold', marks: [{ type: 'bold' }] }, { text: ' text.' }] },
        { id: 'block-3', type: 'list', listType: 'bullet', content: [{ text: 'Item 1' }, { text: 'Item 2' }] },
    ],
    propertyRefs: [
        { id: 'prop-1', anchor: { blockIndex: 1, offset: 25 }, length: 4 },
    ],
    properties: [
        { key: 'prop-1', operator: 'is', values: ['bold'], provenance: 'user' },
    ],
    title: 'Test Note',
    tags: ['test'],
});

const sampleProperties: Property[] = [
    { key: 'need', operator: 'is', values: ['wheelchair ramp'], provenance: 'user' },
    { key: 'deadline', operator: 'is', values: ['2026-11-30'], provenance: 'user' },
];

describe('NoteDocumentAdapter', () => {
    describe('noteDocumentToPM / pmToNoteDocument round-trip', () => {
        it('preserves basic document structure', () => {
            const pmDoc = noteDocumentToPM(sampleNoteDocument);
            const restored = pmToNoteDocument(pmDoc, sampleNoteDocument.properties, sampleNoteDocument.propertyRefs, { title: sampleNoteDocument.title, tags: sampleNoteDocument.tags });

            expect(restored.blocks).toHaveLength(3);
            expect(restored.blocks[0].type).toBe('heading');
            expect(restored.blocks[0].level).toBe(1);
            expect(restored.blocks[1].type).toBe('paragraph');
            expect(restored.blocks[2].type).toBe('list');
            expect(restored.blocks[2].listType).toBe('bullet');
        });

        it('preserves text content', () => {
            const pmDoc = noteDocumentToPM(sampleNoteDocument);
            const restored = pmToNoteDocument(pmDoc, sampleNoteDocument.properties, sampleNoteDocument.propertyRefs, { title: sampleNoteDocument.title, tags: sampleNoteDocument.tags });

            const headingText = restored.blocks[0].content.map(r => r.text).join('');
            expect(headingText).toBe('My Note');

            const paraText = restored.blocks[1].content.map(r => r.text).join('');
            expect(paraText).toBe('This is a paragraph with bold text.');
        });

        it('preserves marks', () => {
            const pmDoc = noteDocumentToPM(sampleNoteDocument);
            const restored = pmToNoteDocument(pmDoc, sampleNoteDocument.properties, sampleNoteDocument.propertyRefs, { title: sampleNoteDocument.title, tags: sampleNoteDocument.tags });

            const boldRun = restored.blocks[1].content.find(r => r.marks?.some(m => m.type === 'bold'));
            expect(boldRun).toBeDefined();
            expect(boldRun?.text).toBe('bold');
        });

        it('preserves propertyRefs', () => {
            const pmDoc = noteDocumentToPM(sampleNoteDocument);
            const restored = pmToNoteDocument(pmDoc, sampleNoteDocument.properties, sampleNoteDocument.propertyRefs, { title: sampleNoteDocument.title, tags: sampleNoteDocument.tags });

            expect(restored.propertyRefs).toHaveLength(1);
            expect(restored.propertyRefs[0].id).toBe('prop-1');
            expect(restored.propertyRefs[0].anchor.blockIndex).toBe(1);
        });

        it('preserves properties', () => {
            const pmDoc = noteDocumentToPM(sampleNoteDocument);
            const restored = pmToNoteDocument(pmDoc, sampleNoteDocument.properties, sampleNoteDocument.propertyRefs, { title: sampleNoteDocument.title, tags: sampleNoteDocument.tags });

            expect(restored.properties).toHaveLength(1);
            expect(restored.properties[0].key).toBe('prop-1');
            expect(restored.properties[0].values).toEqual(['bold']);
        });

        it('preserves metadata', () => {
            const pmDoc = noteDocumentToPM(sampleNoteDocument);
            const restored = pmToNoteDocument(pmDoc, sampleNoteDocument.properties, sampleNoteDocument.propertyRefs, { title: sampleNoteDocument.title, tags: sampleNoteDocument.tags });

            expect(restored.title).toBe('Test Note');
            expect(restored.tags).toEqual(['test']);
            expect(restored.version).toBe(1);
        });
    });

    describe('htmlToNoteDocument', () => {
        it('converts simple HTML to NoteDocument', () => {
            const html = '<p>Hello <strong>world</strong></p>';
            const doc = htmlToNoteDocument(html, sampleProperties);

            expect(doc.blocks).toHaveLength(1);
            expect(doc.blocks[0].type).toBe('paragraph');
            const text = doc.blocks[0].content.map(r => r.text).join('');
            expect(text).toContain('Hello');
            expect(text).toContain('world');
        });

        it('handles headings', () => {
            const html = '<h1>Title</h1><p>Content</p>';
            const doc = htmlToNoteDocument(html);

            expect(doc.blocks).toHaveLength(2);
            expect(doc.blocks[0].type).toBe('heading');
            expect(doc.blocks[0].level).toBe(1);
            expect(doc.blocks[1].type).toBe('paragraph');
        });

        it('handles lists', () => {
            const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
            const doc = htmlToNoteDocument(html);

            expect(doc.blocks).toHaveLength(1);
            expect(doc.blocks[0].type).toBe('list');
            expect(doc.blocks[0].listType).toBe('bullet');
            expect(doc.blocks[0].content).toHaveLength(2);
            expect(doc.blocks[0].content[0].text).toBe('Item 1');
            expect(doc.blocks[0].content[1].text).toBe('Item 2');
        });

        it('handles ordered lists', () => {
            const html = '<ol><li>First</li><li>Second</li></ol>';
            const doc = htmlToNoteDocument(html);

            expect(doc.blocks[0].listType).toBe('ordered');
        });

        it('handles blockquotes', () => {
            const html = '<blockquote>Quoted text</blockquote>';
            const doc = htmlToNoteDocument(html);

            expect(doc.blocks[0].type).toBe('quote');
        });

        it('handles code blocks', () => {
            const html = '<pre><code>code here</code></pre>';
            const doc = htmlToNoteDocument(html);

            expect(doc.blocks[0].type).toBe('code');
        });

        it('preserves properties in propertyRefs', () => {
            const html = '<p>Need: wheelchair ramp</p>';
            const doc = htmlToNoteDocument(html, sampleProperties);

            expect(doc.properties).toEqual(sampleProperties);
            expect(doc.propertyRefs.length).toBe(sampleProperties.length);
        });
    });

    describe('noteDocumentToHtml', () => {
        it('exports heading', () => {
            const doc = createNoteDocument({
                blocks: [{ id: 'b1', type: 'heading', level: 2, content: [{ text: 'Heading' }] }],
            });
            const html = noteDocumentToHtml(doc);
            expect(html).toContain('<h2>Heading</h2>');
        });

        it('exports paragraph', () => {
            const doc = createNoteDocument({
                blocks: [{ id: 'b1', type: 'paragraph', content: [{ text: 'Paragraph text' }] }],
            });
            const html = noteDocumentToHtml(doc);
            expect(html).toContain('<p>Paragraph text</p>');
        });

        it('exports bold/italic/strike/code marks', () => {
            const doc = createNoteDocument({
                blocks: [{
                    id: 'b1',
                    type: 'paragraph',
                    content: [
                        { text: 'bold', marks: [{ type: 'bold' }] },
                        { text: 'italic', marks: [{ type: 'italic' }] },
                        { text: 'strike', marks: [{ type: 'strike' }] },
                        { text: 'code', marks: [{ type: 'code' }] },
                    ],
                }],
            });
            const html = noteDocumentToHtml(doc);
            expect(html).toContain('<strong>bold</strong>');
            expect(html).toContain('<em>italic</em>');
            expect(html).toContain('<del>strike</del>');
            expect(html).toContain('<code>code</code>');
        });

        it('exports propertyRef as span with data attributes', () => {
            const doc: NoteDocument = {
                version: 1,
                blocks: [{
                    id: 'b1',
                    type: 'paragraph',
                    content: [{ text: 'wheelchair ramp', marks: [{ type: 'propertyRef', propertyId: 'need' }] }],
                }],
                propertyRefs: [{ id: 'need', anchor: { blockIndex: 0, offset: 0 }, length: 15 }],
                properties: [{ key: 'need', operator: 'is', values: ['wheelchair ramp'], provenance: 'user' }],
                title: 'Test',
                tags: [],
            };
            const html = noteDocumentToHtml(doc);
            expect(html).toContain('data-type="property"');
            expect(html).toContain('data-name="need"');
        });

        it('exports lists', () => {
            const doc = createNoteDocument({
                blocks: [{
                    id: 'b1',
                    type: 'list',
                    listType: 'bullet',
                    content: [{ text: 'Item 1' }, { text: 'Item 2' }],
                }],
            });
            const html = noteDocumentToHtml(doc);
            expect(html).toContain('<ul>');
            expect(html).toContain('<li>Item 1</li>');
            expect(html).toContain('<li>Item 2</li>');
        });
    });

    describe('full round-trip: Note -> NoteDocument -> PM -> NoteDocument -> Note', () => {
        it('preserves note content through full pipeline', () => {
            const note = createNote({
                id: 'note-1',
                title: 'Test Note',
                content: '<p>Need <span data-type="property" data-name="need">wheelchair ramp</span> by <span data-type="property" data-name="deadline">Friday</span></p>',
                tags: ['accessibility'],
                properties: [
                    { key: 'need', operator: 'is', values: ['wheelchair ramp'], provenance: 'user' },
                    { key: 'deadline', operator: 'is', values: ['Friday'], provenance: 'user' },
                ],
            });

            // Note -> NoteDocument
            const doc = htmlToNoteDocument(note.content, note.properties);
            doc.title = note.title;
            doc.tags = note.tags;

            // NoteDocument -> PM
            const pmDoc = noteDocumentToPM(doc);

            // PM -> NoteDocument
            const restoredDoc = pmToNoteDocument(pmDoc, doc.properties, doc.propertyRefs);

            // NoteDocument -> HTML
            const restoredHtml = noteDocumentToHtml(restoredDoc);

            // Verify key content preserved
            expect(restoredHtml).toContain('wheelchair ramp');
            expect(restoredHtml).toContain('Friday');
            expect(restoredDoc.properties).toHaveLength(2);
        });
    });

    describe('createNoteDocument', () => {
        it('creates valid empty document', () => {
            const doc = createNoteDocument();
            expect(doc.blocks).toHaveLength(1);
            expect(doc.blocks[0].type).toBe('paragraph');
            expect(doc.blocks[0].content[0].text).toBe('');
            expect(doc.propertyRefs).toEqual([]);
            expect(doc.properties).toEqual([]);
            expect(doc.title).toBe('Untitled Note');
            expect(doc.tags).toEqual([]);
            expect(doc.version).toBe(1);
        });

        it('applies overrides', () => {
            const doc = createNoteDocument({ title: 'Custom', tags: ['tag1'] });
            expect(doc.title).toBe('Custom');
            expect(doc.tags).toEqual(['tag1']);
        });
    });

    describe('isValidNoteDocument', () => {
        it('returns true for valid document', () => {
            expect(isValidNoteDocument(sampleNoteDocument)).toBe(true);
        });

        it('returns false for invalid document', () => {
            expect(isValidNoteDocument(null)).toBe(false);
            expect(isValidNoteDocument({})).toBe(false);
            expect(isValidNoteDocument({ version: 2 })).toBe(false);
            expect(isValidNoteDocument({ version: 1, blocks: 'not-array' })).toBe(false);
            expect(isValidNoteDocument({ version: 1, blocks: [], propertyRefs: 'not-array' })).toBe(false);
            expect(isValidNoteDocument({ version: 1, blocks: [], propertyRefs: [], properties: 'not-array' })).toBe(false);
            expect(isValidNoteDocument({ version: 1, blocks: [], propertyRefs: [], properties: [], title: 123 })).toBe(false);
            expect(isValidNoteDocument({ version: 1, blocks: [], propertyRefs: [], properties: [], title: '', tags: 'not-array' })).toBe(false);
        });
    });
});