import type { Note, Property } from '../types/index.js';
import type { Skill, PropertyPattern, ActionSequence } from './types.js';

/**
 * IndeedSkill - Job Board Integration
 */
export class IndeedSkill implements Skill {
    id = 'skill-indeed-v1';
    name = 'Indeed Job Board';
    description = 'Search and import job listings from Indeed.com';
    version = '1.0.0';

    patterns: PropertyPattern[] = [
        {
            required: ['role'],
            optional: ['location', 'salary'],
            minProperties: 1
        }
    ];

    canHandle(note: Note): number {
        // Pattern match
        for (const pattern of this.patterns) {
            const hasRequired = pattern.required.every(req =>
                note.properties.some(p => p.key === req)
            );
            if (hasRequired) return 0.9;
        }

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
        // data is the result of the scrape action (which returns an array of objects)
        // If multiple actions return data, we might need to handle that.
        // For now, assume data is an array where the first element is the scrape result.

        if (!Array.isArray(data) || data.length === 0) return [];
        const result = data[0]; // Assuming scrape is the primary data source and it's in the first result block we care about?
        // Wait, executeAction returns an array of results.

        // If data comes from Agent's executeBrowserAction, it returns [ { titles: [...], ... } ]

        const titles = result.titles || [];
        const companies = result.companies || [];
        const locations = result.locations || [];
        const screenshot = result._screenshot;

        const notes: Note[] = [];

        // Summary Note
        notes.push({
            id: crypto.randomUUID(),
            title: `Indeed Search: ${titles.length} Jobs`,
            content: `Found ${titles.length} jobs for your search.`,
            tags: ['@search-results', '@indeed'],
            properties: [
                { key: 'source', operator: 'is', values: ['Indeed'] },
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

        // Add screenshot if available (as an attachment or content? For now, we don't have a standard field,
        // sticking to how Agent did it: attributes or content)
        // Core Note type doesn't have 'attributes'. Storing in content as img tag?
        if (screenshot) {
            notes[0].content += `<br><img src="${screenshot}" />`;
        }

        // Job Notes (limit 5)
        for (let i = 0; i < Math.min(titles.length, 5); i++) {
            const title = titles[i];
            const company = companies[i] || 'Unknown';
            const location = locations[i] || 'Unknown';

            notes.push({
                id: crypto.randomUUID(),
                title: `${title} at ${company}`,
                content: `<p><strong>Company:</strong> ${company}</p><p><strong>Location:</strong> ${location}</p>`,
                tags: ['@job', '@opportunity'],
                properties: [
                    { key: 'role', operator: 'is', values: [title] },
                    { key: 'company', operator: 'is', values: [company] },
                    { key: 'location', operator: 'is', values: [location] }
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
