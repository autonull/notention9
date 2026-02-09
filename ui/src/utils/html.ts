/**
 * Extracts plain text from an HTML string.
 * @param content - An HTML string.
 * @returns A single string containing all the text from the document.
 */
export function getTextFromHtml(content: string): string {
    if (!content) return '';

    const div = document.createElement('div');
    div.innerHTML = content;

    // Add newlines after block elements for better preview readability
    div
        .querySelectorAll('p, h1, h2, h3, li, blockquote, pre, div')
        .forEach((el) => {
            el.appendChild(document.createTextNode('\n'));
        });

    return div.textContent || '';
}

/**
 * Prepares HTML for display in code view (pretty printing).
 * Adds newlines before block tags to make it more readable.
 */
export const prettyPrintHtml = (html: string) => {
    if (!html) return '';
    const blockTags = [
        'p',
        'h1',
        'h2',
        'h3',
        'hr',
        'ul',
        'ol',
        'li',
        'blockquote',
        'pre',
    ];
    const regex = new RegExp(`(<(?:${blockTags.join('|')})[^>]*>)`, 'g');
    return html.replace(regex, '\n$1').trim();
};
