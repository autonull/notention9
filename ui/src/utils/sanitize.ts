export * from '@notention/core';

export const sanitizeHTML = (dirty: string): string => {
    if (typeof window === 'undefined' || !dirty) {
        return dirty;
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
