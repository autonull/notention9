import type { Skill, PropertyPattern, ActionSequence, BrowserAction, Note } from '../../../core/src/index';
import { createNote } from '../../../core/src/index';

export class CraigslistSkill implements Skill {
    id = 'skill-craigslist-v1';
    name = 'Craigslist Marketplace Search';
    description = 'Search for listings on Craigslist';
    version = '1.0.0';

    patterns: PropertyPattern[] = [
        {
            required: ['product', 'item', 'category', 'price'],
            optional: ['condition', 'location', 'seller', 'brand', 'model'],
            minProperties: 1
        }
    ];

    canHandle(note: Note): number {
        const propertyKeys = new Set(note.properties.map(p => p.key));

        for (const pattern of this.patterns) {
            const hasRequiredKey = pattern.required.some(key => propertyKeys.has(key));
            if (!hasRequiredKey) continue;

            const matchedRequired = pattern.required.filter(key => propertyKeys.has(key)).length;
            const matchedOptional = pattern.optional.filter(key => propertyKeys.has(key)).length;
            const totalMatched = matchedRequired + matchedOptional;

            if (totalMatched >= pattern.minProperties) {
                const confidence = Math.min(0.3 + (totalMatched * 0.15), 1.0);
                return confidence;
            }
        }

        return 0;
    }

    exportToActions(note: Note): ActionSequence {
        const params = new URLSearchParams();

        for (const prop of note.properties) {
            switch (prop.key) {
                case 'product':
                case 'item':
                    params.set('query', prop.values[0]);
                    break;
                case 'category':
                    params.set('category', prop.values[0]);
                    break;
                case 'location':
                    params.set('searchLocation', prop.values[0]);
                    break;
                case 'price':
                    if (prop.operator === 'less than' || prop.operator === '<') {
                        params.set('max_price', prop.values[0]);
                    } else if (prop.operator === 'greater than' || prop.operator === '>') {
                        params.set('min_price', prop.values[0]);
                    }
                    break;
            }
        }

        const url = `https://craigslist.org/search/sss?${params.toString()}`;

        const actions: BrowserAction[] = [
            { type: 'navigate', url },
            {
                type: 'scrape',
                selector: '.result-row',
                scrapeRules: {
                    title: '.result-title',
                    price: '.result-price',
                    location: '.result-hood',
                    url: '.result-title@href',
                    imageUrl: '.result-image@data-ids',
                    postedDate: 'time@datetime'
                }
            }
        ];

        return {
            id: `${this.id}-${Date.now()}`,
            name: `Craigslist: ${params.get('query') || 'search'}`,
            sourceNote: note,
            actions
        };
    }

    importFromData(scrapedData: unknown[], sourceNote: Note): Note[] {
        return (scrapedData as any[]).map((item, idx) =>
            createNote({
                title: item.title || `Craigslist Listing ${idx + 1}`,
                properties: [
                    ...(item.price ? [{ key: 'price', operator: 'is' as const, values: [item.price.replace('$', '')] }] : []),
                    ...(item.location ? [{ key: 'location', operator: 'is' as const, values: [item.location] }] : []),
                    ...(item.postedDate ? [{ key: 'postedDate', operator: 'is' as const, values: [item.postedDate] }] : []),
                    { key: 'source', operator: 'is' as const, values: ['craigslist'] },
                    { key: 'url', operator: 'is' as const, values: [item.url || ''] }
                ],
                source: {
                    type: 'skill',
                    identifier: this.id,
                    url: item.url,
                    timestamp: Date.now()
                },
                public: false,
                priority: 0.2
            })
        );
    }

    preview(note: Note): string {
        const product = note.properties.find(p => p.key === 'product' || p.key === 'item')?.values[0];
        const location = note.properties.find(p => p.key === 'location')?.values[0];
        return `Search "${product}"${location ? ` in ${location}` : ''}`;
    }
}
