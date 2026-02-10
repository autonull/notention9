import { describe, it, expect, vi } from 'vitest';
import { ConfigSkill } from '../ConfigSkill.js';
import { Note } from '@notention/core';

describe('ConfigSkill', () => {
    const mockUpdater = vi.fn();
    const skill = new ConfigSkill(mockUpdater);

    it('should identify config notes by tags', () => {
        const note = {
            id: '1',
            tags: ['config'],
            properties: []
        } as unknown as Note;
        expect(skill.canHandle(note)).toBe(1.0);
    });

    it('should identify config notes by properties', () => {
        const note = {
            id: '2',
            tags: [],
            properties: [{ key: 'llm_model', operator: 'is', values: ['gpt-4'] }]
        } as unknown as Note;
        expect(skill.canHandle(note)).toBe(1.0);
    });

    it('should export actions correctly', () => {
        const note = {
            id: '3',
            tags: [],
            properties: [
                { key: 'llm_model', operator: 'is', values: ['gpt-4'] },
                { key: 'config', operator: 'is', values: ['debug_mode=true'] }
            ]
        } as unknown as Note;

        const actionSeq = skill.exportToActions(note);
        expect(mockUpdater).toHaveBeenCalledWith('llm_model', 'gpt-4');
        expect(mockUpdater).toHaveBeenCalledWith('debug_mode', 'true');
        expect(actionSeq.expectedOutcome).toContain('updated internally');
    });
});
