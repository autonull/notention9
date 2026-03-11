import type { Note, Property } from '../types/index.js';
import type { Skill, PropertyPattern, ActionSequence } from './types.js';

/**
 * CraigslistSkill - Classifieds Search
 */
export class CraigslistSkill implements Skill {
    id = 'skill-craigslist-search';
    name = 'Craigslist Search';
    description = 'Search Craigslist for items or housing';
    version = '1.0.0';

    patterns: PropertyPattern[] = [
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
        const result = data[0];

        const titles = result.titles || [];
        const prices = result.prices || [];
        const screenshot = result._screenshot;

        const notes: Note[] = [];

        // Summary Note
        notes.push({
            id: crypto.randomUUID(),
            title: 'Craigslist Search Results',
            content: `Found ${titles.length} listings.`,
            tags: ['@search-results', '@craigslist'],
            properties: [
                { key: 'count', operator: 'is', values: [titles.length.toString()] }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: {
                type: 'skill',
                identifier: this.id,
                timestamp: Date.now()
            },
            privacy: 'private',
            priority: 0.5
        } as Note);

        if (screenshot) {
             notes[0].content += `<br><img src="${screenshot}" />`;
        }

        // Individual Listings
        for (let i = 0; i < Math.min(titles.length, 5); i++) {
            notes.push({
                id: crypto.randomUUID(),
                title: titles[i],
                content: `Price: ${prices[i] || 'N/A'}`,
                tags: ['@listing', '@craigslist'],
                properties: [
                    { key: 'price', operator: 'is', values: [prices[i] || '0'] }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: {
                    type: 'skill',
                    identifier: this.id,
                    timestamp: Date.now()
                },
                privacy: 'private',
                priority: 0.5
            } as Note);
        }

        return notes;
    }

    private extractValue(note: Note, keys: string[]): string | undefined {
        for (const key of keys) {
            const prop = note.properties.find(p => p.key === key);
            if (prop && prop.values.length > 0) return prop.values[0];
        }
        return undefined;
    }
}
