import { describe, it, expect } from 'vitest';
import { SkillToolAdapter } from '../SkillToolAdapter.js';
import type { ActionSequence } from '@notention/core/src/skills/types';

describe('SkillToolAdapter', () => {
    describe('convertToAgentAction', () => {
        it('should return null if no navigation action', () => {
            const actions = [{ type: 'click', selector: 'button' }];
            const result = SkillToolAdapter.convertToAgentAction(actions as any);
            expect(result).toBeNull();
        });

        it('should extract navigation URL', () => {
            const actions = [
                { type: 'navigate', url: 'https://example.com' },
                { type: 'click', selector: 'button' }
            ];
            const result = SkillToolAdapter.convertToAgentAction(actions as any);
            expect(result).toEqual({
                type: 'browser',
                url: 'https://example.com',
                interactions: [{ type: 'click', selector: 'button', value: undefined }]
            });
        });

        it('should extract scrape rules', () => {
            const actions = [
                { type: 'navigate', url: 'https://example.com' },
                { type: 'scrape', scrapeRules: { title: 'h1' } }
            ];
            const result = SkillToolAdapter.convertToAgentAction(actions as any);
            expect(result?.extract).toEqual({ title: 'h1' });
        });

        it('should extract screenshot option', () => {
            const actions = [
                { type: 'navigate', url: 'https://example.com' },
                { type: 'screenshot', fullPage: true }
            ];
            const result = SkillToolAdapter.convertToAgentAction(actions as any);
            expect(result?.screenshot).toBe('full');
        });

        it('should map wait action correctly', () => {
            const actions = [
                { type: 'navigate', url: 'https://example.com' },
                { type: 'wait', duration: 1000 }
            ];
            const result = SkillToolAdapter.convertToAgentAction(actions as any);
            expect(result?.interactions[0]).toEqual({ type: 'wait', value: 1000 });
        });
    });
});
