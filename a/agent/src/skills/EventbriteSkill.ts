import type { Skill, PropertyPattern, ActionSequence, BrowserAction, Note } from '../../../core/src/index';
import { createNote } from '../../../core/src/index';

export class EventbriteSkill implements Skill {
    id = 'skill-eventbrite-v1';
    name = 'Eventbrite Event Search';
    description = 'Find events on Eventbrite';
    version = '1.0.0';

    patterns: PropertyPattern[] = [
        {
            required: ['event', 'concert', 'conference', 'meetup', 'workshop'],
            optional: ['startDateTime', 'endDateTime', 'venue', 'location', 'price', 'category'],
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
                case 'event':
                case 'concert':
                case 'conference':
                case 'meetup':
                case 'workshop':
                    params.set('q', prop.values[0]);
                    break;
                case 'location':
                case 'venue':
                    params.set('location', prop.values[0]);
                    break;
                case 'category':
                    params.set('category', prop.values[0]);
                    break;
                case 'startDateTime':
                    params.set('date', prop.values[0]);
                    break;
            }
        }

        if (!params.has('q')) {
            params.set('q', note.title);
        }

        const url = `https://www.eventbrite.com/d/${params.get('location') || 'online'}/events/?${params.toString()}`;

        const actions: BrowserAction[] = [
            { type: 'navigate', url },
            {
                type: 'scrape',
                selector: '[data-testid="search-result-card"]',
                scrapeRules: {
                    title: 'h2',
                    date: '[data-testid="event-card-date"]',
                    location: '[data-testid="event-card-location"]',
                    price: '[data-testid="event-card-price"]',
                    url: 'a@href',
                    imageUrl: 'img@src'
                }
            }
        ];

        return {
            id: `${this.id}-${Date.now()}`,
            name: `Eventbrite: ${params.get('q') || 'events'}`,
            sourceNote: note,
            actions
        };
    }

    importFromData(scrapedData: unknown[], sourceNote: Note): Note[] {
        return (scrapedData as any[]).map((item, idx) =>
            createNote({
                title: item.title || `Event ${idx + 1}`,
                properties: [
                    ...(item.date ? [{ key: 'startDateTime', operator: 'is' as const, values: [item.date] }] : []),
                    ...(item.location ? [{ key: 'venue', operator: 'is' as const, values: [item.location] }] : []),
                    ...(item.price ? [{ key: 'price', operator: 'is' as const, values: [item.price] }] : []),
                    { key: 'source', operator: 'is' as const, values: ['eventbrite'] },
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
        const event = note.properties.find(p => ['event', 'concert', 'conference'].includes(p.key))?.values[0];
        const location = note.properties.find(p => p.key === 'location' || p.key === 'venue')?.values[0];
        return `Find events "${event || note.title}"${location ? ` in ${location}` : ''}`;
    }
}
