import { describe, it, expect } from 'vitest';
import { extractPropertiesFromTags, convertEventToNote } from '@notention/core';
import type { NostrEvent } from '@notention/core';

describe('utils/nostr', () => {
    describe('extractPropertiesFromTags', () => {
        it('should extract properties from tags', () => {
            const tags = [
                ['property', 'skill', 'is', 'react'],
                ['property', 'level', '>', '5'],
                ['t', 'react']
            ];
            const props = extractPropertiesFromTags(tags);
            expect(props).toHaveLength(2);
            expect(props.find(p => p.key === 'skill')).toEqual({
                key: 'skill',
                operator: 'is',
                values: ['react']
            });
            expect(props.find(p => p.key === 'level')).toEqual({
                key: 'level',
                operator: '>',
                values: ['5']
            });
        });

        it('should handle multi-value properties', () => {
            const tags = [
                ['property', 'skill', 'is', 'react'],
                ['property', 'skill', 'is', 'node']
            ];
            const props = extractPropertiesFromTags(tags);
            expect(props).toHaveLength(1);
            expect(props[0].values).toContain('react');
            expect(props[0].values).toContain('node');
        });
    });

    describe('convertEventToNote', () => {
        it('should convert a NostrEvent to a Note', () => {
            const event: NostrEvent = {
                id: '123',
                pubkey: 'abc',
                created_at: 1672531200, // 2023-01-01
                kind: 1,
                tags: [
                    ['t', 'tag1'],
                    ['property', 'prop1', 'is', 'val1']
                ],
                content: 'Hello World',
                sig: 'sig'
            };

            const note = convertEventToNote(event);

            expect(note.id).toBe('123');
            expect(note.content).toBe('Hello World');
            expect(note.tags).toEqual(['tag1']);
            expect(note.properties).toHaveLength(1);
            expect(note.properties[0].key).toBe('prop1');
            expect(note.nostrEventId).toBe('123');
            expect(note.createdAt).toBe(new Date(1672531200 * 1000).toISOString());
        });
    });
});
