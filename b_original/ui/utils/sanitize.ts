// Define forbidden tags and attributes for clarity and reuse.
const FORBIDDEN_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'style']);
const FORBIDDEN_ATTR = new Set([
  'onclick', 'onerror', 'onload', 'onmouseover', 'onmouseout', 'onfocus',
  'onblur', 'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
  'onmousedown', 'onmouseup', 'ondblclick', 'oncontextmenu', 'onwheel',
  'ondrag', 'ondrop', 'onscroll'
]);

// Helper to escape HTML entities
const escapeHTML = (str: string) => {
  const p = document.createElement('p');
  p.appendChild(document.createTextNode(str));
  return p.innerHTML;
};

export const escapeAttribute = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

export const sanitizeHTML = (dirty: string): string => {
  if (typeof window === 'undefined' || !dirty) {
    return dirty;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirty, 'text/html');

  // 1. Quarantine forbidden tags
  doc.querySelectorAll(Array.from(FORBIDDEN_TAGS).join(',')).forEach(tagNode => {
    const originalHtml = tagNode.outerHTML;
    const pre = doc.createElement('pre');
    pre.className = 'quarantined-code';
    pre.textContent = originalHtml;
    tagNode.parentNode?.replaceChild(pre, tagNode);
  });

  // 2. Quarantine forbidden attributes
  doc.querySelectorAll('*').forEach(element => {
    const attrs = Array.from(element.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      let shouldQuarantine = false;

      if (FORBIDDEN_ATTR.has(name)) {
        shouldQuarantine = true;
      } else if ((name === 'href' || name === 'src') && value.trim().toLowerCase().startsWith('javascript:')) {
        shouldQuarantine = true;
      }

      if (shouldQuarantine) {
        const quarantinedAttr = doc.createElement('span');
        quarantinedAttr.className = 'quarantined-code';
        quarantinedAttr.textContent = ` ${attr.name}="${escapeHTML(value)}"`;

        // Insert the quarantined span as the first child of the element
        element.insertBefore(quarantinedAttr, element.firstChild);

        // Remove the dangerous attribute
        element.removeAttribute(attr.name);
      }
    }
  });

  return doc.body.innerHTML;
};
