import { Note } from '@notention/core/src/types';
import { Skill, SkillAction } from '../types';

export class CraigslistSkill implements Skill {
    id = 'skill-craigslist-search';
    name = 'Craigslist Search';
    description = 'Search Craigslist for items or housing';

    async export(note: Note): Promise<SkillAction | null> {
        // [search:apt] [price_max:2000]
        const content = note.content.toLowerCase();

        let query = content;
        let category = 'sss'; // for sale by default
        if (content.includes('apartment') || content.includes('housing')) category = 'apa';

        // Default to SF bay area for demo
        const baseUrl = `https://sfbay.craigslist.org/search/${category}?query=${encodeURIComponent(query)}`;

        return {
            type: 'browser',
            url: baseUrl,
            extract: {
                titles: '.titlestring',
                prices: '.priceinfo'
            },
            interactions: [
                { type: 'wait', value: 1000 }
            ],
            screenshot: 'full' // Provide visual proof
        };
    }

    async import(results: any): Promise<Note[]> {
        if (!results || !results[0]) return [];
        const data = results[0];

        const titles = data.titles || [];
        const prices = data.prices || [];

        const notes: Note[] = [];

        // Summary Note
        notes.push({
            id: crypto.randomUUID(),
            title: 'Craigslist Search Results',
            content: `Found ${titles.length} listings.`,
            tags: ['@search-results', '@craigslist'],
            source: 'VoltBrowser',
            timestamp: Date.now(),
            attributes: {
                screenshot: data._screenshot
            }
        } as unknown as Note);

        // Individual Listings
        for (let i = 0; i < Math.min(titles.length, 5); i++) {
            notes.push({
                id: crypto.randomUUID(),
                title: titles[i],
                content: `Price: ${prices[i] || 'N/A'}`,
                tags: ['@listing'],
                source: 'VoltBrowser',
                timestamp: Date.now()
            } as unknown as Note);
        }

        return notes;
    }
}
