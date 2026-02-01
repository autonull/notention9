import type { Skill, PropertyPattern, ActionSequence, BrowserAction, Note } from '../../../core/src/index';
import { createNote } from '../../../core/src/index';

export class ZillowSkill implements Skill {
    id = 'skill-zillow-v1';
    name = 'Zillow Real Estate Search';
    description = 'Search real estate on Zillow';
    version = '1.0.0';

    patterns: PropertyPattern[] = [
        {
            required: ['property', 'house', 'apartment', 'home', 'realEstate'],
            optional: ['bedrooms', 'bathrooms', 'price', 'location', 'neighborhood', 'sqft', 'type'],
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
        let location = '';

        for (const prop of note.properties) {
            switch (prop.key) {
                case 'location':
                case 'neighborhood':
                    location = prop.values[0];
                    break;
                case 'bedrooms':
                    params.set('beds', prop.values[0]);
                    break;
                case 'bathrooms':
                    params.set('baths', prop.values[0]);
                    break;
                case 'price':
                    if (prop.operator === 'less than' || prop.operator === '<') {
                        params.set('price_max', prop.values[0]);
                    } else if (prop.operator === 'greater than' || prop.operator === '>') {
                        params.set('price_min', prop.values[0]);
                    }
                    break;
                case 'type':
                    params.set('home_type', prop.values[0]);
                    break;
            }
        }

        const locationSlug = location.toLowerCase().replace(/\s+/g, '-').replace(/,/g, '');
        const url = `https://www.zillow.com/homes/${locationSlug}_rb/?${params.toString()}`;

        const actions: BrowserAction[] = [
            { type: 'navigate', url },
            {
                type: 'scrape',
                selector: 'article[data-test="property-card"]',
                scrapeRules: {
                    address: '[data-test="property-card-addr"]',
                    price: '[data-test="property-card-price"]',
                    bedrooms: '[data-test="property-card-bed"]',
                    bathrooms: '[data-test="property-card-bath"]',
                    sqft: '[data-test="property-card-sqft"]',
                    url: 'a@href',
                    imageUrl: 'img@src'
                }
            }
        ];

        return {
            id: `${this.id}-${Date.now()}`,
            name: `Zillow: ${location || 'properties'}`,
            sourceNote: note,
            actions
        };
    }

    importFromData(scrapedData: unknown[], sourceNote: Note): Note[] {
        return (scrapedData as any[]).map((item, idx) =>
            createNote({
                title: item.address || `Property ${idx + 1}`,
                properties: [
                    ...(item.price ? [{ key: 'price', operator: 'is' as const, values: [item.price.replace('$', '').replace(',', '')] }] : []),
                    ...(item.bedrooms ? [{ key: 'bedrooms', operator: 'is' as const, values: [item.bedrooms] }] : []),
                    ...(item.bathrooms ? [{ key: 'bathrooms', operator: 'is' as const, values: [item.bathrooms] }] : []),
                    ...(item.sqft ? [{ key: 'sqft', operator: 'is' as const, values: [item.sqft] }] : []),
                    { key: 'source', operator: 'is' as const, values: ['zillow'] },
                    { key: 'url', operator: 'is' as const, values: [`https://www.zillow.com${item.url}`] }
                ],
                source: {
                    type: 'skill',
                    identifier: this.id,
                    url: item.url ? `https://www.zillow.com${item.url}` : '',
                    timestamp: Date.now()
                },
                public: false,
                priority: 0.2
            })
        );
    }

    preview(note: Note): string {
        const location = note.properties.find(p => p.key === 'location' || p.key === 'neighborhood')?.values[0];
        const bedrooms = note.properties.find(p => p.key === 'bedrooms')?.values[0];
        return `Search properties${location ? ` in ${location}` : ''}${bedrooms ? ` (${bedrooms} bed)` : ''}`;
    }
}
