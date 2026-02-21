import {describe, expect, it} from 'vitest';
import {sanitizeHTML} from '@/utils/sanitize.ts';

describe('sanitizeHTML', () => {
    it('should quarantine script tags from the input string', () => {
        const dirtyHTML = '<p>Hello <script>alert("xss");</script> World</p>';
        const sanitizedHTML = sanitizeHTML(dirtyHTML);
        expect(sanitizedHTML).toContain('<pre class="quarantined-code">&lt;script&gt;alert("xss");&lt;/script&gt;</pre>');
    });

    it('should keep safe tags like <p> and <b>', () => {
        const safeHTML = '<p>This is <b>bold</b> text.</p>';
        const sanitizedHTML = sanitizeHTML(safeHTML);
        expect(sanitizedHTML).toBe(safeHTML);
    });

    it('should quarantine dangerous attributes like onclick', () => {
        const dangerousHTML = '<p onclick="alert(\'xss\')">Click me</p>';
        const sanitizedHTML = sanitizeHTML(dangerousHTML);
        // The implementation adds a span with the quarantined attribute
        expect(sanitizedHTML).toContain('<span class="quarantined-code"> onclick="alert(\'xss\')"</span>');
        expect(sanitizedHTML).toContain('Click me');
        expect(sanitizedHTML).not.toContain('<p onclick=');
    });

    it('should handle an empty string', () => {
        const emptyHTML = '';
        const sanitizedHTML = sanitizeHTML(emptyHTML);
        expect(sanitizedHTML).toBe('');
    });
});
