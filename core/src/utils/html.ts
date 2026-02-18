/**
 * Extracts plain text from an HTML string using regex.
 * Safe for use in Node.js and Browser.
 */
export function getTextFromHtml(html: string): string {
    if (!html) return '';
    // Replace block tags with newlines
    let text = html.replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, '\n');
    // Replace <br> with newline
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Strip all other tags
    text = text.replace(/<[^>]+>/g, '');
    // Decode entities (basic ones)
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
    return text.trim();
}
