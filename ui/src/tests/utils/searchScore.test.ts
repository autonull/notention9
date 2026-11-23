import {describe, expect, it} from 'vitest';
import type {RegisteredAction} from '@notention/core/ui/actionRegistry';
import {scoreMatch, wordInitials} from '../../utils/searchScore';

const action = (overrides: Partial<RegisteredAction>): RegisteredAction => ({
    id: 'action',
    label: 'Open settings',
    run: () => undefined,
    ...overrides,
});

describe('scoreMatch', () => {
    it('ranks a title prefix above a contained title', () => {
        const prefix = scoreMatch('open', action({label: 'Open settings'}));
        const contained = scoreMatch('open', action({label: 'Reopen settings'}));
        expect(prefix).toBeGreaterThan(contained!);
    });

    it('matches tags and details with a hash or by name', () => {
        const note = action({label: 'Garden help', tags: ['note', 'request', 'skill', 'React']});
        expect(scoreMatch('#request', note)).toBeGreaterThan(0);
        expect(scoreMatch('request', note)).toBeGreaterThan(0);
        expect(scoreMatch('react', note)).toBeGreaterThan(0);
        expect(scoreMatch('missing', note)).toBeNull();
    });

    it('keeps acronym matches', () => {
        expect(wordInitials('Open settings')).toBe('os');
        expect(scoreMatch('os', action({label: 'Open settings'}))).toBeGreaterThan(0);
    });
});
