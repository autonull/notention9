import {describe, expect, it} from 'vitest';
import {formatPropertyRange, formatPropertyValue, formatPropertyValues} from '../../utils/propertyDisplay';

describe('formatPropertyValue', () => {
    it('keeps prose values and replaces separators', () => {
        expect(formatPropertyValue('web_development')).toBe('web development');
        expect(formatPropertyValue('Community Hall, Berlin')).toBe('Community Hall, Berlin');
        expect(formatPropertyValue('900')).toBe('900');
    });

    it('shortens ontology paths to their leaf', () => {
        expect(formatPropertyValue('work/job-request')).toBe('job request');
        expect(formatPropertyValue('work/job-request, request/need-request')).toBe('job request, need request');
        expect(formatPropertyValue('https://example.com/job/123')).toBe('https://example.com/job/123');
    });

    it('compacts coordinate pairs', () => {
        expect(formatPropertyValue('52.52000,13.40500')).toBe('52.52, 13.405');
        expect(formatPropertyValue('52.52000, 13.40500')).toBe('52.52, 13.405');
        expect(formatPropertyValue('120, 13')).toBe('120, 13');
    });

    it('formats dates and date-times', () => {
        expect(formatPropertyValue('2026-10-24')).toBe('24 Oct 2026');
        expect(formatPropertyValue('2026-10-24T18:00')).toBe('24 Oct 2026, 18:00');
        expect(formatPropertyValue('2026-10-24T18:00:00.000Z')).not.toBe('2026-10-24T18:00:00.000Z');
    });

    it('joins multiple values for display', () => {
        expect(formatPropertyValues(['work/job-request', 'request/need-request']))
            .toBe('job request, need request');
        expect(formatPropertyRange(['900', '1200'])).toBe('900–1200');
    });
});
