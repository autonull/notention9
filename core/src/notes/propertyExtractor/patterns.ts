export const PATTERNS = {
  SEND_TO: /(?:send|message)\s+(?:to|)\s+([+\w@#-]+)/i,
  CHANNEL: /(?:via|using|on|through)\s+(\w+)/i,
} as const;

export const TYPE_CHECKERS = {
  NUMBER: /^-?\d+(\.\d+)?$/,
  DATE: /^\d{4}-\d{2}-\d{2}/,
  DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  GEO: /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/,
} as const;

export const INTENTS = [
  { key: 'reminder', regex: /remind.*me.*(to|about|that).*|set.*reminder/i },
  { key: 'schedule', regex: /schedule|book|plan|arrange.*for|appointment.*with/i },
  { key: 'communication', regex: /email|send.*message|text|call|contact.*about/i },
  { key: 'task', regex: /todo|to-do|task|do.*later|need.*to|want.*to/i },
  { key: 'shopping', regex: /buy|purchase|order|get.*from|shop.*for/i },
  { key: 'health', regex: /medication|take.*pill|doctor.*appointment|exercise|workout/i },
] as const;

export const LOCATION_KEYWORDS = ['near', 'in', 'at'];
export const LOCATION_PATTERNS = LOCATION_KEYWORDS.map(k => ({
  regex: new RegExp(`${k}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`),
  prefix: new RegExp(`^${k}\\s+`, 'i'),
}));

export const DATE_PATTERNS = [
  { regex: /tomorrow/i, offset: 1 },
  { regex: /today/i, offset: 0 },
  { regex: /yesterday/i, offset: -1 },
] as const;

export const STOP_WORDS = new Set(['with', 'the', 'and', 'for', 'from', 'near', 'about', 'that', 'this']);