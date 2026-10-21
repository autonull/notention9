const HTML_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
};

import { REGEX } from '../notes/parsing/index.js';

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

/**
 * Sanitizes HTML by removing forbidden tags and attributes.
 * Uses DOMParser in the browser, throws in Node.js (no DOMParser available).
 */
export const sanitizeHTML = (dirty: string): string => {
  if (!dirty) return dirty;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('sanitizeHTML requires DOMParser (browser environment only)');
  }

  const FORBIDDEN_TAGS = ['script', 'iframe', 'object', 'embed', 'style'];
  const FORBIDDEN_ATTR = [
    'onclick', 'onerror', 'onload', 'onmouseover', 'onmouseout', 'onfocus',
    'onblur', 'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
    'onmousedown', 'onmouseup', 'ondblclick', 'oncontextmenu', 'onwheel',
    'ondrag', 'ondrop', 'onscroll'
  ];

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirty, 'text/html');

  doc.querySelectorAll(FORBIDDEN_TAGS.join(',')).forEach(tagNode => {
    const pre = doc.createElement('pre');
    pre.className = 'quarantined-code';
    pre.textContent = tagNode.outerHTML;
    tagNode.parentNode?.replaceChild(pre, tagNode);
  });

  doc.querySelectorAll('*').forEach(element => {
    Array.from(element.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      const isJavascriptAction = (name === 'href' || name === 'src') && value.trim().toLowerCase().startsWith('javascript:');

      if (FORBIDDEN_ATTR.includes(name) || isJavascriptAction) {
        const quarantinedAttr = doc.createElement('span');
        quarantinedAttr.className = 'quarantined-code';
        quarantinedAttr.textContent = ` ${attr.name}="${value}"`;
        element.insertBefore(quarantinedAttr, element.firstChild);
        element.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
};
