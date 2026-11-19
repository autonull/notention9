import type { Property, Note } from '../types/index.js';

/**
 * Inference rules for parsing `need` property values and inferring additional properties.
 * Each rule has a pattern to match against the need value and properties to infer.
 */
export interface InferenceRule {
  /** Keywords that trigger this rule (any can trigger) */
  keywords: string[];
  /** Properties to infer when the rule matches */
  infer: Property[];
  /** Priority for ordering when multiple rules match */
  priority: number;
}

/**
 * Default inference rules for common need patterns.
 * Rules are applied in priority order (highest first).
 */
export const DEFAULT_INFERENCE_RULES: InferenceRule[] = [
  {
    keywords: ['weekend', 'weekends'],
    priority: 10,
    infer: [
      { key: 'schedule', operator: 'contains', values: ['weekends'] },
      { key: 'frequency', operator: 'contains', values: ['weekly'] },
    ],
  },
  {
    keywords: ['weekday', 'weekdays'],
    priority: 10,
    infer: [
      { key: 'schedule', operator: 'contains', values: ['weekdays'] },
      { key: 'frequency', operator: 'contains', values: ['weekly'] },
    ],
  },
  {
    keywords: ['daily', 'every day'],
    priority: 10,
    infer: [
      { key: 'schedule', operator: 'contains', values: ['daily'] },
      { key: 'frequency', operator: 'contains', values: ['daily'] },
    ],
  },
  {
    keywords: ['mentor', 'mentoring', 'mentorship'],
    priority: 9,
    infer: [
      { key: 'role', operator: 'contains', values: ['mentor'] },
    ],
  },
  {
    keywords: ['tutor', 'tutoring', 'tutoring'],
    priority: 9,
    infer: [
      { key: 'role', operator: 'contains', values: ['tutor'] },
    ],
  },
  {
    keywords: ['instructor', 'instructing'],
    priority: 9,
    infer: [
      { key: 'role', operator: 'contains', values: ['instructor'] },
    ],
  },
  {
    keywords: ['coach', 'coaching'],
    priority: 9,
    infer: [
      { key: 'role', operator: 'contains', values: ['coach'] },
    ],
  },
  {
    keywords: ['teacher', 'teaching'],
    priority: 9,
    infer: [
      { key: 'role', operator: 'contains', values: ['teacher'] },
    ],
  },
  {
    keywords: ['driver', 'driving'],
    priority: 9,
    infer: [
      { key: 'role', operator: 'contains', values: ['driver'] },
    ],
  },
  {
    keywords: ['photographer', 'photography'],
    priority: 9,
    infer: [
      { key: 'role', operator: 'contains', values: ['photographer'] },
    ],
  },
  {
    keywords: ['developer', 'programmer', 'coding', 'programming'],
    priority: 8,
    infer: [
      { key: 'role', operator: 'contains', values: ['developer'] },
      { key: 'skill', operator: 'contains', values: ['coding'] },
    ],
  },
  {
    keywords: ['designer', 'design'],
    priority: 8,
    infer: [
      { key: 'role', operator: 'contains', values: ['designer'] },
    ],
  },
  {
    keywords: ['writer', 'writing', 'copywriter'],
    priority: 8,
    infer: [
      { key: 'role', operator: 'contains', values: ['writer'] },
    ],
  },
  {
    keywords: ['translator', 'translation'],
    priority: 8,
    infer: [
      { key: 'role', operator: 'contains', values: ['translator'] },
    ],
  },
  {
    keywords: ['editor', 'editing'],
    priority: 8,
    infer: [
      { key: 'role', operator: 'contains', values: ['editor'] },
    ],
  },
  {
    keywords: ['mover', 'moving', 'move'],
    priority: 8,
    infer: [
      { key: 'role', operator: 'contains', values: ['mover'] },
    ],
  },
  {
    keywords: ['cleaner', 'cleaning', 'clean'],
    priority: 8,
    infer: [
      { key: 'role', operator: 'contains', values: ['cleaner'] },
    ],
  },
  {
    keywords: ['babysitter', 'babysitting', 'childcare', 'nanny'],
    priority: 8,
    infer: [
      { key: 'role', operator: 'contains', values: ['babysitter'] },
      { key: 'audience', operator: 'contains', values: ['children'] },
    ],
  },
  {
    keywords: ['elderly', 'senior', 'senior care', 'elder care'],
    priority: 8,
    infer: [
      { key: 'audience', operator: 'contains', values: ['seniors'] },
    ],
  },
  {
    keywords: ['remote', 'online', 'virtual'],
    priority: 7,
    infer: [
      { key: 'format', operator: 'contains', values: ['remote'] },
    ],
  },
  {
    keywords: ['in-person', 'in person', 'onsite', 'on-site'],
    priority: 7,
    infer: [
      { key: 'format', operator: 'contains', values: ['in-person'] },
    ],
  },
  {
    keywords: ['hour', 'hourly', 'per hour'],
    priority: 7,
    infer: [
      { key: 'duration', operator: 'contains', values: ['hourly'] },
    ],
  },
  {
    keywords: ['session', 'per session'],
    priority: 7,
    infer: [
      { key: 'duration', operator: 'contains', values: ['session'] },
    ],
  },
  {
    keywords: ['project', 'per project'],
    priority: 7,
    infer: [
      { key: 'duration', operator: 'contains', values: ['project'] },
    ],
  },
  {
    keywords: ['free', 'pro bono', 'volunteer', 'no cost'],
    priority: 6,
    infer: [
      { key: 'price', operator: 'is', values: ['0', 'free'] },
    ],
  },
  {
    keywords: ['cheap', 'affordable', 'low cost', 'budget'],
    priority: 6,
    infer: [
      { key: 'budget', operator: 'less than', values: ['100 USD'] },
    ],
  },
  {
    keywords: ['urgent', 'asap', 'immediate', 'now'],
    priority: 6,
    infer: [
      { key: 'urgency', operator: 'contains', values: ['urgent'] },
    ],
  },
  {
    keywords: ['flexible', 'flexible schedule', 'any time'],
    priority: 6,
    infer: [
      { key: 'schedule', operator: 'contains', values: ['flexible'] },
    ],
  },
];

/**
 * Check if a need value matches a rule's keywords.
 * Any keyword in the rule can trigger the rule (case-insensitive, word boundary).
 */
function matchesRule(needValue: string, rule: InferenceRule): boolean {
  const lowerValue = needValue.toLowerCase();
  return rule.keywords.some(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    // Use word boundary matching to avoid partial matches like "now" in "unknown"
    const regex = new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    return regex.test(lowerValue);
  });
}

/**
 * Infer additional properties from a need property value.
 * Returns an array of inferred properties, deduplicated by key+operator+values.
 */
export function inferFromNeed(needProp: Property, rules: InferenceRule[] = DEFAULT_INFERENCE_RULES): Property[] {
  const inferred: Property[] = [];
  const seen = new Set<string>();

  for (const value of needProp.values) {
    // Sort rules by priority (highest first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (matchesRule(value, rule)) {
        for (const inferredProp of rule.infer) {
          const key = `${inferredProp.key}:${inferredProp.operator}:${inferredProp.values.join(',')}`;
          if (!seen.has(key)) {
            seen.add(key);
            // Preserve the original need property's role if not specified
            inferred.push({
              ...inferredProp,
              role: inferredProp.role ?? needProp.role,
              unit: inferredProp.unit ?? needProp.unit,
            });
          }
        }
      }
    }
  }

  return inferred;
}

/**
 * Apply inference rules to all `need` properties in a request note.
 * Returns a new note with inferred properties added.
 */
export function applyNeedInference(note: Note, rules: InferenceRule[] = DEFAULT_INFERENCE_RULES): Note {
  const needProps = note.properties.filter(p => p.key === 'need');
  if (needProps.length === 0) return note;

  const inferredProps: Property[] = [];
  for (const needProp of needProps) {
    inferredProps.push(...inferFromNeed(needProp, rules));
  }

  if (inferredProps.length === 0) return note;

  return {
    ...note,
    properties: [...note.properties, ...inferredProps],
  };
}