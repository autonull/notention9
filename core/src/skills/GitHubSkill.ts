import type { Note, Property } from '../types/index.js';
import type { Skill, PropertyPattern, ActionSequence } from './types.js';
import { SkillBase } from './SkillBase.js';

/**
 * GitHubSkill - Repository Search
 */
export class GitHubSkill extends SkillBase implements Skill {
  readonly id = 'skill-github-search';
  readonly name = 'GitHub Repository Search';
  readonly description = 'Search GitHub for repositories';
  readonly version = '1.0.0';

  readonly patterns: PropertyPattern[] = [
    {
      required: ['query'],
      minProperties: 1
    }
  ];

  canHandle(note: Note): number {
    const content = note.content.toLowerCase();
    if (content.includes('github') || content.includes('repo')) return 0.8;
    return 0;
  }

  exportToActions(note: Note): ActionSequence {
    const content = note.content;
    const query = encodeURIComponent(content);

    return {
      id: `github-search-${Date.now()}`,
      name: `Search GitHub for ${content}`,
      sourceNote: note,
      actions: [
        {
          type: 'navigate',
          url: `https://github.com/search?q=${query}&type=repositories`,
          description: `Navigate to GitHub search`
        },
        {
          type: 'wait',
          duration: 1500,
          description: 'Wait for results'
        },
        {
          type: 'scrape',
          scrapeRules: {
            repos: '.search-title .v-align-middle',
            descriptions: '.search-match-desc'
          },
          description: 'Extract repositories'
        },
        {
          type: 'screenshot',
          fullPage: true,
          description: 'Capture search results'
        }
      ],
      expectedOutcome: 'List of GitHub repositories'
    };
  }

  importFromData(data: unknown, sourceNote: Note): Note[] {
    if (!Array.isArray(data) || data.length === 0) return [];
    const result = data[0] as { repos?: unknown[]; descriptions?: unknown[]; _screenshot?: string };

    const repos = (result.repos || []) as string[];
    const descriptions = (result.descriptions || []) as string[];
    const screenshot = result._screenshot;

    const summaryNote = this.createSummaryNote(
      sourceNote,
      repos.length,
      'GitHub',
      [
        { key: 'count', operator: 'is', values: [repos.length.toString()] }
      ],
      screenshot
    );

    const repoNotes = this.createItemNotes(
      repos,
      (repo, _) => repo,
      (_, i) => descriptions[i] || 'No description',
      () => [],
      ['@repo', '@github']
    );

    return [summaryNote, ...repoNotes];
  }
}