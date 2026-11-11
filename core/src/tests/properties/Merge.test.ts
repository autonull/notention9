import {describe, expect, it} from 'vitest';
import {NotePipeline} from '../../notes/notes.js';
import {replacePropertyInContent, removePropertyFromContent} from '../../notes/parsing/formatting.js';
import {buildDemoWorkspace} from '../../fixtures/demoWorkspace.js';

const SPAN = (name: string, value: string) =>
    `<span data-type="property" data-name="${name}" data-operator="is" data-value="${value}"></span>`;

describe('property merge', () => {
    it('keeps the properties the note already had when the content states none', async () => {
        const [note] = buildDemoWorkspace(0);

        const updated = await NotePipeline.updateContent(note, '<p>Edited prose.</p>');

        for (const property of note.properties) {
            const kept = updated.properties.find(p => p.key === property.key);
            expect(kept?.values).toEqual(property.values);
        }
    });

    it('lets the content win for the keys it states', async () => {
        const [note] = buildDemoWorkspace(0);

        const updated = await NotePipeline.updateContent(note, `<p>Prose.</p><p>${SPAN('status', 'done')}</p>`);

        expect(updated.properties.find(p => p.key === 'status')?.values).toEqual(['done']);
    });

    it('removes a property from the note and its content', async () => {
        const [note] = buildDemoWorkspace(0);
        const withProperty = {...note, content: `<p>Prose.</p><p>${SPAN('status', 'open')}</p>`};

        const updated = await NotePipeline.removeProperty(withProperty, 'status');

        expect(updated.properties.find(p => p.key === 'status')).toBeUndefined();
        expect(updated.content).not.toContain('data-type="property"');
    });
});

describe('property serialization in content', () => {
    it('replaces a canonical span in place', () => {
        const content = `<p>Prose.</p><p>${SPAN('status', 'open')}</p>`;

        const replaced = replacePropertyInContent(content, {key: 'status', operator: 'is', values: ['open']}, {key: 'status', operator: 'is', values: ['done']});

        expect(replaced).toBe(`<p>Prose.</p><p>${SPAN('status', 'done')}</p>`);
    });

    it('replaces a bracket tag in place', () => {
        const content = '<p>Prose [status:is:open]</p>';

        const replaced = replacePropertyInContent(content, {key: 'status', operator: 'is', values: ['open']}, {key: 'status', operator: 'is', values: ['done']});

        expect(replaced).toBe('<p>Prose [status:is:done]</p>');
    });

    it('removes every serialization of a property', () => {
        const content = `<p>${SPAN('status', 'open')}</p><p>[status:is:open]</p>`;

        expect(removePropertyFromContent(content, 'status')).toBe('<p></p><p></p>');
    });
});
