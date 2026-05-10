const HTML_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
};

import { REGEX } from '../parsing.js';

/**
 * Extracts plain text from an HTML string using an environment-agnostic approach.
 * Uses DOMParser in the browser for maximum accuracy, falls back to robust regex in Node.
 */
export const getTextFromHtml = (html: string): string => {
  if (!html) return '';

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div').forEach((el) => {
      el.appendChild(document.createTextNode('\n'));
    });
    return div.textContent?.trim() || '';
  }

  // Node.js fallback
  let text = html.replace(REGEX.BLOCK_TAGS, '\n');
  text = text.replace(REGEX.BR_TAGS, '\n');
  text = text.replace(REGEX.HTML_TAGS, '');
  for (const [entity, char] of Object.entries(HTML_ENTITY_MAP)) {
    text = text.replace(new RegExp(entity, 'g'), char);
  }
  return text.trim();
};

/**
 * Prepares HTML for display in code view (pretty printing).
 * Adds newlines before block tags to make it more readable.
 */
export const prettyPrintHtml = (html: string): string => {
  if (!html) return '';
  const blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'ul', 'ol', 'li', 'blockquote', 'pre', 'div'];
  const regex = new RegExp(`(<(?:${blockTags.join('|')})[^>]*>)`, 'g');
  return html.replace(regex, '\n$1').trim();
};
