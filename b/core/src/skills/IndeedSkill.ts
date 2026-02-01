import type { Note, Property } from '../types';
import type { Skill, PropertyPattern, ActionSequence } from './types';

/**
 * IndeedSkill - Job Board Integration
 * Demonstrates matching of semantic notes to external browser actions.
 */
export class IndeedSkill implements Skill {
    id = 'skill-indeed-v1';
    name = 'Indeed Job Board';
    description = 'Search and import job listings from Indeed.com';
    version = '1.0.0';

    // Patterns this skill recognizes
    patterns: PropertyPattern[] = [
        // Pattern 1: Job Request (e.g., "Find me a react job in Austin")
        {
            required: ['role', 'intent'],
            optional: ['location', 'salary', 'type'],
            minProperties: 2
        },
        // Pattern 2: Explicit job search
        {
            required: ['job', 'location'],
            optional: ['budget', 'remote']
        }
    ];

    /**
     * Check if this skill handles the note
     */
    canHandle(note: Note): number {
        // Simple heuristic: Must have matching pattern
        for (const pattern of this.patterns) {
            const hasRequired = pattern.required.every(req =>
                note.properties.some(p => p.key === req)
            );

            // Also check specific intent values if 'intent' is required
            const intentProp = note.properties.find(p => p.key === 'intent');
            const hasCorrectIntent = !pattern.required.includes('intent') ||
                                   (intentProp && ['job', 'work', 'career'].some(v => intentProp.values.includes(v)));

            if (hasRequired) return 0.9;
        }

        // Fallback: Check for 'indeed' keyword in content
        if (note.content.toLowerCase().includes('indeed')) return 0.8;

        return 0;
    }

    /**
     * Export note to browser actions (Search Indeed)
     */
    exportToActions(note: Note): ActionSequence {
        const role = this.extractValue(note, ['role', 'job', 'title']) || 'software engineer';
        const location = this.extractValue(note, ['location', 'city']) || 'remote';

        return {
            id: `indeed-search-${Date.now()}`,
            name: `Search Indeed for ${role}`,
            sourceNote: note,
            actions: [
                {
                    type: 'navigate',
                    url: `https://www.indeed.com/jobs?q=${encodeURIComponent(role)}&l=${encodeURIComponent(location)}`,
                    description: `Navigate to Indeed search for ${role}`
                },
                {
                    type: 'wait',
                    duration: 2000,
                    description: 'Wait for results to load'
                },
                {
                    type: 'scrape',
                    scrapeRules: {
                        role: '.jobTitle',
                        company: '.companyName',
                        location: '.companyLocation',
                        salary: '.salary-snippet'
                    },
                    description: 'Extract job listings'
                }
            ],
            expectedOutcome: 'List of job opportunities imported as notes'
        };
    }

    /**
     * Import scraped data as notes
     */
    importFromData(data: unknown, sourceNote: Note): Note[] {
        if (!Array.isArray(data)) return [];

        return data.map((item, index) => {
            const properties: Property[] = [
                { key: 'role', operator: 'is', values: [item.role || 'Unknown Role'] },
                { key: 'company', operator: 'is', values: [item.company || 'Unknown Company'] },
                { key: 'source', operator: 'is', values: ['indeed'] }
            ];

            if (item.location) {
                properties.push({ key: 'location', operator: 'is', values: [item.location] });
            }

            if (item.salary) {
                properties.push({ key: 'salary', operator: 'is', values: [item.salary] });
            }

            return {
                id: `indeed-import-${Date.now()}-${index}`,
                title: `${item.role} at ${item.company}`,
                content: `<p>Imported from Indeed match.</p><p><strong>Role:</strong> ${item.role}</p><p><strong>Company:</strong> ${item.company}</p>`,
                tags: ['job', 'indeed', 'import'],
                properties,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),

                // Provenance
                source: {
                    type: 'skill',
                    identifier: this.id,
                    timestamp: Date.now()
                },

                // Default privacy for imports
                public: false,
                priority: 0.5
            };
        });
    }

    private extractValue(note: Note, keys: string[]): string | undefined {
        for (const key of keys) {
            const prop = note.properties.find(p => p.key === key);
            if (prop && prop.values.length > 0) return prop.values[0];
        }
        return undefined;
    }
}
