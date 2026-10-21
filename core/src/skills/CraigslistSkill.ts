import type { Note, Property } from '../types/index.js';
import type { Skill, PropertyPattern, ActionSequence } from './types.js';
import { SkillBase } from './SkillBase.js';

/**
 * CraigslistSkill - Classifieds Search
 */
export class CraigslistSkill extends SkillBase implements Skill {
  readonly id = 'skill-craigslist-search';
  readonly name = 'Craigslist Search';
  readonly description = 'Search Craigslist for items or housing';
  readonly version = '1.0.0';

  readonly patterns: PropertyPattern[] = [
    {
      required: ['query'],
      optional: ['category', 'price_max'],
      minProperties: 1
    }
  ];

  canHandle(note: Note): number {
    const content = note.content.toLowerCase();
    if (content.includes('craigslist')) return 0.8;
    return 0;
  }

  exportToActions(note: Note): ActionSequence {
    const content = note.content.toLowerCase();
    let query = this.extractValue(note, ['query', 'search']) || content;

    let category = 'sss'; // for sale
    if (content.includes('apartment') || content.includes('housing')) category = 'apa';

    // Defaulting to sfbay for consistency with original agent skill
    const url = `https://sfbay.craigslist.org/search/${category}?query=${encodeURIComponent(query)}`;

    return {
      id: `craigslist-search-${Date.now()}`,
      name: `Search Craigslist for ${query}`,
      sourceNote: note,
      actions: [
        {
          type: 'navigate',
          url,
          description: `Navigate to Craigslist search`
        },
        {
          type: 'wait',
          duration: 1000,
          description: 'Wait for results'
        },
        {
          type: 'scrape',
          scrapeRules: {
            titles: '.titlestring',
            prices: '.priceinfo'
          },
          description: 'Extract listings'
        },
        {
          type: 'screenshot',
          fullPage: true,
          description: 'Capture search results'
        }
      ],
      expectedOutcome: 'List of items found on Craigslist'
    };
  }

  importFromData(data: unknown, sourceNote: Note): Note[] {
    if (!Array.isArray(data) || data.length === 0) return [];
    const result = data[0] as { titles?: unknown[]; prices?: unknown[]; _screenshot?: string };

    const titles = (result.titles || []) as string[];
    const prices = (result.prices || []) as string[];
    const screenshot = result._screenshot;

    const summaryNote = this.createSummaryNote(
      sourceNote,
      titles.length,
      'Craigslist',
      [
        { key: 'count', operator: 'is', values: [titles.length.toString()] }
      ],
      screenshot
    );

    const listingNotes = this.createItemNotes(
      titles,
      (title, i) => title,
      (_, i) => `Price: ${prices[i] || 'N/A'}`,
      (_, i) => [
        { key: 'price', operator: 'is', values: [prices[i] || '0'] }
      ],
      ['@listing', '@craigslist']
    );

    return [summaryNote, ...listingNotes];
  }
}