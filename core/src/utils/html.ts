const HTML_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
};

const BLOCK_TAGS = /<\/(p|div|h[1-6]|li|blockquote|pre)>/gi;
const BR_TAGS = /<br\s*\/?>/gi;
const ALL_TAGS = /<[^>]+>/g;

export const getTextFromHtml = (html: string): string => {
  if (!html) return '';
  let text = html.replace(BLOCK_TAGS, '\n');
  text = text.replace(BR_TAGS, '\n');
  text = text.replace(ALL_TAGS, '');
  for (const [entity, char] of Object.entries(HTML_ENTITY_MAP)) {
    text = text.replace(new RegExp(entity, 'g'), char);
  }
  return text.trim();
};
