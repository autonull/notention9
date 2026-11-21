import type { SkillDefinition, SemanticPattern } from '../../skills/skillPatternMatcher.js';

/**
 * SkillDefinition mappings for reference skills.
 * These provide the semantic patterns for the SkillPatternMatcher (ontology-based fuzzy matching).
 * They correspond to the reference Skill implementations (IndeedSkill, GitHubSkill, etc.).
 */

export const referenceSkillDefinitions: SkillDefinition[] = [
  {
    id: 'skill-indeed-v1',
    name: 'Indeed Job Board',
    description: 'Search and import job listings from Indeed.com',
    semanticPattern: {
      requiresAll: [
        { keySimilarTo: ['role', 'job', 'position'], attributeType: 'string' }
      ],
      requiresAny: [
        { keySimilarTo: ['location', 'city', 'remote'], attributeType: 'string' },
        { keySimilarTo: ['salary', 'compensation', 'rate'], attributeType: 'number' }
      ]
    },
    exportMapping: {
      role: 'q',
      location: 'l',
      salary: 'salary'
    },
    importMapping: {
      title: 'role',
      company: 'company',
      location: 'location'
    }
  },
  {
    id: 'skill-github-v1',
    name: 'GitHub Search',
    description: 'Search GitHub repositories and issues',
    semanticPattern: {
      requiresAll: [
        { keySimilarTo: ['repo', 'repository', 'project'], attributeType: 'string' }
      ],
      requiresAny: [
        { keySimilarTo: ['language', 'lang'], attributeType: 'string' },
        { keySimilarTo: ['topic', 'tag'], attributeType: 'string' },
        { keySimilarTo: ['stars', 'forks'], attributeType: 'number' }
      ]
    },
    exportMapping: {
      repo: 'q',
      language: 'language',
      topic: 'topic'
    },
    importMapping: {
      name: 'repo',
      description: 'description',
      language: 'language',
      stars: 'stars'
    }
  },
  {
    id: 'skill-craigslist-v1',
    name: 'Craigslist Search',
    description: 'Search Craigslist classifieds',
    semanticPattern: {
      requiresAll: [
        { keySimilarTo: ['query', 'search', 'item'], attributeType: 'string' }
      ],
      requiresAny: [
        { keySimilarTo: ['location', 'city', 'area'], attributeType: 'string' },
        { keySimilarTo: ['category', 'type'], attributeType: 'string' },
        { keySimilarTo: ['price', 'cost', 'budget'], attributeType: 'number' }
      ]
    },
    exportMapping: {
      query: 'query',
      location: 'area',
      category: 'category',
      price: 'price'
    },
    importMapping: {
      title: 'query',
      price: 'price',
      location: 'location'
    }
  },
  {
    id: 'skill-reminder-v1',
    name: 'Reminder Skill',
    description: 'Create reminders and scheduled notifications',
    semanticPattern: {
      requiresAll: [
        { keySimilarTo: ['remind', 'reminder', 'alert', 'schedule'], attributeType: 'string' }
      ],
      requiresAny: [
        { keySimilarTo: ['time', 'when', 'date', 'deadline'], attributeType: 'date' },
        { keySimilarTo: ['frequency', 'repeat', 'recurring'], attributeType: 'string' },
        { keySimilarTo: ['message', 'note', 'content'], attributeType: 'string' }
      ]
    },
    exportMapping: {
      remind: 'message',
      time: 'time',
      frequency: 'frequency'
    },
    importMapping: {
      message: 'remind',
      time: 'time',
      frequency: 'frequency'
    }
  }
];

/**
 * Get skill definitions by their IDs (for SkillExecutor registration)
 */
export function getSkillDefinition(id: string): SkillDefinition | undefined {
  return referenceSkillDefinitions.find(s => s.id === id);
}

/**
 * Get all skill definitions
 */
export function getAllSkillDefinitions(): SkillDefinition[] {
  return [...referenceSkillDefinitions];
}