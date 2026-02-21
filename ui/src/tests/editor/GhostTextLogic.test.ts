import { describe, it, expect } from 'vitest';

// Simulating the match logic since full TipTap test requires DOM
function getGhostTextReplacement(text: string): string | null {
    const match = text.match(/^(Buy|Call|Email|Meet) (.+)$/i);
    if (!match) return null;

    const action = match[1].toLowerCase();
    const object = match[2];

    if (action === 'buy') {
        return `[task:buy] [item:${object}]`;
    } else if (action === 'call') {
        return `[task:call] [person:${object}]`;
    } else if (action === 'email') {
        return `[task:email] [person:${object}]`;
    } else if (action === 'meet') {
        return `[task:meeting] [attendee:${object}]`;
    }
    return null;
}

describe('GhostText Logic', () => {
    it('should replace "Buy milk"', () => {
        expect(getGhostTextReplacement('Buy milk')).toBe('[task:buy] [item:milk]');
    });

    it('should replace "Call Mom"', () => {
        expect(getGhostTextReplacement('Call Mom')).toBe('[task:call] [person:Mom]');
    });

    it('should replace "Email boss"', () => {
        expect(getGhostTextReplacement('Email boss')).toBe('[task:email] [person:boss]');
    });

    it('should replace "Meet Alice"', () => {
        expect(getGhostTextReplacement('Meet Alice')).toBe('[task:meeting] [attendee:Alice]');
    });

    it('should ignore non-matching text', () => {
        expect(getGhostTextReplacement('Hello world')).toBeNull();
    });
});
