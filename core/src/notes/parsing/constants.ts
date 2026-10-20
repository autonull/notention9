export const SYMBOL_TO_OP: Record<string, string> = {
  '<=': 'less than or equal',
  '>=': 'greater than or equal',
  '<': 'less than',
  '>': 'greater than',
  '=': 'is',
  ':': 'is',
  '!=': 'is not',
  '≈': 'is near',
  '∋': 'contains',
};

export const COMMON_WORDS = new Set([
  'not', 'neither', 'the', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'this', 'that', 'these', 'those',
  'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
]);

export const REGEX = {
  WORD_OP: /^([^\s]+)\s+(is|contains|before|after|less than|greater than|between|range|not)\s+(.+)$/i,
  COLON: /^([^\s]+):(.+)$/,
  PHONE: /(\+?\d{10,15})/,
  EMAIL: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  BUDGET: /(?:\$|USD\s*)(\d+(?:,\d{3})*(?:\.\d+)?)|(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:USD|dollars?)/i,
  SPACE: /^([^\s]+)\s+(.+)$/,
  VALID_KEY: /^[a-zA-Z[\]][a-zA-Z0-9_.[\]\s-]*$/,
  BRACKET: /\[([^\]]+)\]/g,
  MACRO: /@([a-zA-Z0-9_]+)/g,
  SPAN: /<span\s+[^>]*data-type=["']property["'][^>]*>/g,
  SPAN_ATTR_NAME: /data-name=["']([^"']+)["']/,
  SPAN_ATTR_OP: /data-operator=["']([^"']+)["']/,
  SPAN_ATTR_VAL: /data-value=["']([^"']+)["']/,
  HTML_TAGS: /<[^>]+>/g,
  BLOCK_TAGS: /<\/(p|div|h[1-6]|li|blockquote|pre)>/gi,
  BR_TAGS: /<br\s*\/?>/gi,
} as const;

export const SYMBOLIC_REGEXES = Object.entries(SYMBOL_TO_OP)
  .sort(([a], [b]) => b.length - a.length)
  .map(([sym, op]) => ({
    regex: new RegExp(`^(.+?)\\s*(${sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*(.*)$`),
    op,
  }));