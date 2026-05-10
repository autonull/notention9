export const DAILY_PROMPTS = [
  "What's one thing you learned today?",
  'Describe a problem you\'re trying to solve.',
  'Draft a message to a potential collaborator.',
  'List 3 goals for this week.',
  'Capture a quick thought about a project.',
  'Who would be a valuable connection right now?',
  'What knowledge is missing from your network?',
] as const;

export const SEMANTIC_NOTE_KIND = 35000;

// Note status values
export const NOTE_STATUS = {
  RUNNING: 'running',
  QUEUED: 'queued',
  KEY: 'status',
} as const;

// Ontology constants
export const EMERGENT_NODE_ID = 'emergent';
export const EMERGENT_NODE_LABEL = 'Emergent';

// Property key constants
export const DATE_PROPERTY_KEYS = ['date', 'deadline', 'start', 'end'] as const;

// Suggestion thresholds
export const SUGGESTION_THRESHOLD = {
  DEV: 1,
  PROD: 3,
} as const;
