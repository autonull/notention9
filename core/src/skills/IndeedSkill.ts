import type { Note, Property } from '../types/index.js';
import type { Skill, PropertyPattern, ActionSequence } from './types.js';
import { SkillBase } from './SkillBase.js';

/**
 * IndeedSkill - Job Board Integration
 */
export class IndeedSkill extends SkillBase implements Skill {
  readonly id = 'skill-indeed-v1';
  readonly name = 'Indeed Job Board';
  readonly description = 'Search and import job listings from Indeed.com';
  readonly version = '1.0.0';

  readonly patterns: PropertyPattern[] = [
    {
      required: ['role'],
      optional: ['location', 'salary'],
      minProperties: 1
    }
  ];

  canHandle(note: Note): number {
    // Pattern match
    const matchesPattern = this.patterns.some(pattern =>
      pattern.required.every(req => note.properties.some(p => p.key === req))
    );
    if (matchesPattern) return 0.9;

    // Keyword fallback
    const content = note.content.toLowerCase();
    if (content.includes('indeed') || (content.includes('job') && content.includes('search'))) {
      return 0.8;
    }

    return 0;
  }

  exportToActions(note: Note): ActionSequence {
    const role = this.extractValue(note, ['role', 'job', 'title']) || 'software engineer';
    const location = this.extractValue(note, ['location', 'city']) || 'Remote';

    // Fallback to content if no properties
    let q = role;
    if (note.content.toLowerCase().includes('react')) q = 'react developer';

    return {
      id: `indeed-search-${Date.now()}`,
      name: `Search Indeed for ${q}`,
      sourceNote: note,
      actions: [
        {
          type: 'navigate',
          url: `https://www.indeed.com/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(location)}`,
          description: `Navigate to Indeed search for ${q}`
        },
        {
          type: 'wait',
          duration: 2000,
          description: 'Wait for results'
        },
        {
          type: 'scrape',
          scrapeRules: {
            titles: 'h2.jobTitle span',
            companies: '[data-testid="company-name"]',
            locations: '[data-testid="text-location"]'
          },
          description: 'Extract job listings'
        },
        {
          type: 'screenshot',
          fullPage: true,
          description: 'Capture search results'
        }
      ],
      expectedOutcome: 'List of job opportunities'
    };
  }

  importFromData(data: unknown, sourceNote: Note): Note[] {
    if (!Array.isArray(data) || data.length === 0) return [];
    const result = data[0];

    const titles = result.titles || [];
    const companies = result.companies || [];
    const locations = result.locations || [];
    const screenshot = result._screenshot;

    const summaryNote = this.createSummaryNote(
      sourceNote,
      titles.length,
      'Indeed',
      [
        { key: 'source', operator: 'is', values: ['Indeed'] },
        { key: 'count', operator: 'is', values: [titles.length.toString()] }
      ],
      screenshot
    );

    const jobNotes = this.createItemNotes(
      titles,
      (title, i) => `${title} at ${companies[i] || 'Unknown'}`,
      (_, i) => {
        const company = companies[i] || 'Unknown';
        const location = locations[i] || 'Unknown';
        return `<p><strong>Company:</strong> ${company}</p><p><strong>Location:</strong> ${location}</p>`;
      },
      (title, i) => [
        { key: 'role', operator: 'is', values: [title] },
        { key: 'company', operator: 'is', values: [companies[i] || 'Unknown'] },
        { key: 'location', operator: 'is', values: [locations[i] || 'Unknown'] }
      ],
      ['@job', '@opportunity']
    );

    return [summaryNote, ...jobNotes];
  }
}