import { describe, it, expect } from 'vitest';
import { DynamicSkill } from '../../skills/DynamicSkill.js';
import type { Note } from '@notention/core';

describe('DynamicSkill', () => {
    it('should score 1.0 if both tags and properties match', () => {
        const skill = new DynamicSkill({
            id: 'test',
            name: 'Test',
            description: 'Test',
            trigger: {
                tags: ['target'],
                properties: [{ key: 'status', value: 'active' }]
            },
            action: { type: 'prompt', payload: {} }
        });

        const note = {
            tags: ['target', 'other'],
            properties: [{ key: 'status', operator: 'is', values: ['active'] }]
        } as unknown as Note;

        expect(skill.canHandle(note)).toBe(1.0);
    });

    it('should score 0.5 if only tag matches', () => {
        const skill = new DynamicSkill({
            id: 'test',
            name: 'Test',
            description: 'Test',
            trigger: {
                tags: ['target'],
                properties: [{ key: 'status', value: 'active' }]
            },
            action: { type: 'prompt', payload: {} }
        });

        const note = {
            tags: ['target'],
            properties: []
        } as unknown as Note;

        expect(skill.canHandle(note)).toBe(0.5);
    });

    it('should score 0.5 if only property matches', () => {
        const skill = new DynamicSkill({
            id: 'test',
            name: 'Test',
            description: 'Test',
            trigger: {
                tags: ['target'],
                properties: [{ key: 'status', value: 'active' }]
            },
            action: { type: 'prompt', payload: {} }
        });

        const note = {
            tags: [],
            properties: [{ key: 'status', operator: 'is', values: ['active'] }]
        } as unknown as Note;

        expect(skill.canHandle(note)).toBe(0.5);
    });

    it('should handle property match without value constraint', () => {
        const skill = new DynamicSkill({
            id: 'test',
            name: 'Test',
            description: 'Test',
            trigger: {
                properties: [{ key: 'anyprop' }]
            },
            action: { type: 'prompt', payload: {} }
        });

        const note = {
            tags: [],
            properties: [{ key: 'anyprop', operator: 'is', values: ['foo'] }]
        } as unknown as Note;

        expect(skill.canHandle(note)).toBe(0.5);
    });

    it('should export actions with prompt replacement', () => {
        const skill = new DynamicSkill({
            id: 'test',
            name: 'Test',
            description: 'Test',
            trigger: {},
            action: { type: 'prompt', payload: { prompt: 'Analyze {{content}}' } }
        });

        const note = {
            content: 'Hello World'
        } as unknown as Note;

        const result = skill.exportToActions(note);
        // @ts-ignore
        expect(result.customAction.payload.prompt).toBe('Analyze Hello World');
    });
});
