import { describe, it, expect } from 'vitest';
import {
    detectPII,
    redactPII,
    redactPIIForTransport,
    hasPII,
    getPIIStats,
    PIIMatch,
} from './piiRedaction.js';

describe('PII Redaction', () => {
    describe('detectPII', () => {
        it('detects emails', () => {
            const text = 'Contact me at john.doe@example.com or jane@test.org';
            const matches = detectPII(text);
            expect(matches.filter(m => m.kind === 'email')).toHaveLength(2);
        });

        it('detects phone numbers in various formats', () => {
            const text = 'Call (555) 123-4567 or 555-123-4567 or +1-555-123-4567';
            const matches = detectPII(text);
            const phones = matches.filter(m => m.kind === 'phone');
            expect(phones.length).toBeGreaterThanOrEqual(2);
        });

        it('detects SSNs', () => {
            const text = 'SSN: 123-45-6789 and 987654321';
            const matches = detectPII(text);
            const ssns = matches.filter(m => m.kind === 'ssn');
            expect(ssns.length).toBeGreaterThanOrEqual(1);
        });

        it('returns empty array for clean text', () => {
            const text = 'This is a normal note about a project meeting.';
            const matches = detectPII(text);
            expect(matches).toHaveLength(0);
        });

        it('sorts matches by position descending', () => {
            const text = 'Email: a@b.com Phone: 555-123-4567';
            const matches = detectPII(text);
            expect(matches[0].start).toBeGreaterThanOrEqual(matches[1].start);
        });
    });

    describe('redactPII', () => {
        it('redacts emails with default mask', () => {
            const text = 'Contact john.doe@example.com for info';
            const result = redactPII(text);
            expect(result.text).toContain('[EMAIL]');
            expect(result.text).not.toContain('john.doe@example.com');
            expect(result.hasRedactions).toBe(true);
        });

        it('redacts phones with default mask', () => {
            const text = 'Call (555) 123-4567 today';
            const result = redactPII(text);
            expect(result.text).toContain('[PHONE]');
            expect(result.hasRedactions).toBe(true);
        });

        it('redacts SSNs with default mask', () => {
            const text = 'SSN is 123-45-6789';
            const result = redactPII(text);
            expect(result.text).toContain('[SSN]');
            expect(result.hasRedactions).toBe(true);
        });

        it('handles multiple PII types', () => {
            const text = 'Email john@test.com, call 555-123-4567, SSN 123-45-6789';
            const result = redactPII(text);
            expect(result.text).toContain('[EMAIL]');
            expect(result.text).toContain('[PHONE]');
            expect(result.text).toContain('[SSN]');
            expect(result.matches).toHaveLength(3);
        });

        it('returns original text when no PII', () => {
            const text = 'No sensitive info here';
            const result = redactPII(text);
            expect(result.text).toBe(text);
            expect(result.hasRedactions).toBe(false);
            expect(result.matches).toHaveLength(0);
        });

        it('supports custom masks', () => {
            const text = 'Email john@test.com';
            const result = redactPII(text, {
                customMasks: { email: '<REDACTED_EMAIL>' },
            });
            expect(result.text).toContain('<REDACTED_EMAIL>');
        });

        it('supports custom mask generators', () => {
            const text = 'Email john.doe@example.com';
            const result = redactPII(text, {
                maskGenerators: {
                    email: (m) => `<<${m.split('@')[0]}>>`,
                },
            });
            expect(result.text).toContain('<<john.doe>>');
        });

        it('filters by kinds', () => {
            const text = 'Email john@test.com and phone 555-123-4567';
            const result = redactPII(text, { kinds: ['email'] });
            expect(result.text).toContain('[EMAIL]');
            expect(result.text).toContain('555-123-4567'); // phone not redacted
        });

        it('preserves match positions in result', () => {
            const text = 'Contact john@test.com now';
            const result = redactPII(text);
            expect(result.matches[0].original).toBe('john@test.com');
            expect(result.matches[0].redacted).toBe('[EMAIL]');
            expect(result.matches[0].kind).toBe('email');
        });
    });

    describe('redactPIIForTransport', () => {
        it('uses simple mask tokens', () => {
            const text = 'Email john@test.com, call 555-123-4567';
            const result = redactPIIForTransport(text);
            expect(result).toContain('[EMAIL]');
            expect(result).toContain('[PHONE]');
            expect(result).not.toContain('john@test.com');
            expect(result).not.toContain('555-123-4567');
        });
    });

    describe('hasPII', () => {
        it('returns true when PII present', () => {
            expect(hasPII('Email me at test@example.com')).toBe(true);
            expect(hasPII('Call 555-123-4567')).toBe(true);
            expect(hasPII('SSN 123-45-6789')).toBe(true);
        });

        it('returns false for clean text', () => {
            expect(hasPII('Just a regular note')).toBe(false);
        });

        it('filters by kinds', () => {
            expect(hasPII('test@example.com', ['phone'])).toBe(false);
            expect(hasPII('test@example.com', ['email'])).toBe(true);
        });
    });

    describe('getPIIStats', () => {
        it('counts each PII type', () => {
            const text = 'Emails: a@b.com, c@d.com. Phone: 555-123-4567. SSN: 123-45-6789';
            const stats = getPIIStats(text);
            expect(stats.email).toBe(2);
            expect(stats.phone).toBe(1);
            expect(stats.ssn).toBe(1);
        });

        it('returns zeros for clean text', () => {
            const stats = getPIIStats('No PII here');
            expect(stats.email).toBe(0);
            expect(stats.phone).toBe(0);
            expect(stats.ssn).toBe(0);
        });
    });

    describe('edge cases', () => {
        it('handles email at start of text', () => {
            const result = redactPII('john@test.com is my email');
            expect(result.text).toContain('[EMAIL]');
        });

        it('handles email at end of text', () => {
            const result = redactPII('My email is john@test.com');
            expect(result.text).toContain('[EMAIL]');
        });

        it('handles phone with country code', () => {
            const result = redactPII('+1-555-123-4567');
            expect(result.text).toContain('[PHONE]');
        });

        it('handles SSN without dashes', () => {
            const result = redactPII('123456789');
            expect(result.text).toContain('[SSN]');
        });

        it('does not match invalid SSN (900 prefix)', () => {
            const result = redactPII('900-45-6789');
            // 900 is not a valid SSN area number
            expect(result.matches.filter(m => m.kind === 'ssn')).toHaveLength(0);
        });

        it('handles overlapping matches correctly', () => {
            const text = 'Contact: john@test.com 555-123-4567';
            const result = redactPII(text);
            expect(result.matches.length).toBe(2);
        });
    });
});