import type { Skill, PropertyPattern, ActionSequence, BrowserAction } from '@notention/core';
import { createNote } from '@notention/core';
import type { Note } from '@notention/core';

/**
 * IndeedSkill matches job-related notes and translates them to Indeed.com searches.
 * 
 * Ontology Pattern Matching:
 * - Matches notes with: role, skill, job, salary, location (from work/job-request ontology)
 * - Creates browser actions to search Indeed.com
 * - Imports results as structured notes with proper metadata
 */
export class IndeedSkill implements Skill {
    id = 'skill-indeed-v1';
    name = 'Indeed Job Search';
    description = 'Search for jobs on Indeed';
    version = '1.0.0';

    patterns: PropertyPattern[] = [
        {
            // Core pattern: Must have role OR skill OR job
            required: ['role', 'skill', 'job'],
            optional: ['salary', 'location', 'remote', 'budget'],
            minProperties: 1
        }
    ];

    /**
     * Check if this skill can handle the given note.
     * Returns confidence based on property key matches with ontology patterns.
     */
    canHandle(note: Note): number {
        if (note.properties.length === 0) return 0;

        const propertyKeys = new Set(note.properties.map(p => p.key));

        for (const pattern of this.patterns) {
            // Check if any required key is present
            const hasRequiredKey = pattern.required.some(key => propertyKeys.has(key));
            if (!hasRequiredKey) continue;

            // Calculate confidence based on total matches
            const totalKeys = [...pattern.required, ...(pattern.optional || [])];
            const matchCount = totalKeys.filter(key => propertyKeys.has(key)).length;
            const confidence = matchCount / totalKeys.length;

            // Boost confidence if minimum properties met
            if (note.properties.length >= (pattern.minProperties || 1)) {
                return Math.min(confidence * 1.2, 1.0);
            }

            return confidence;
        }

        return 0;
    }

    /**
     * Export note to browser actions.
     * Translates semantic properties (role, location, salary) into Indeed search.
     */
    exportToActions(note: Note): ActionSequence {
        // Extract semantic properties from note
        const role = this.extractPropertyValue(note, ['role', 'skill', 'job']) || 'software developer';
        const location = this.extractPropertyValue(note, ['location']) || 'remote';
        const salary = this.extractPropertyValue(note, ['salary', 'budget', 'rate']);

        // Build Indeed search URL from semantic parameters
        const params = new URLSearchParams({
            q: role,
            l: location
        });

        if (salary) {
            // Extract numeric salary for filter
            const salaryNum = salary.match(/\d+/)?.[0];
            if (salaryNum) {
                params.append('salary', salaryNum);
            }
        }

        const url = `https://www.indeed.com/jobs?${params.toString()}`;

        const actions: BrowserAction[] = [
            {
                type: 'navigate',
                url,
                description: `Navigate to Indeed search for "${role}" in "${location}"`
            },
            {
                type: 'wait',
                duration: 2000,
                description: 'Wait for page to load'
            },
            {
                type: 'scrape',
                scrapeRules: {
                    'role': '.jobTitle',
                    'company': '.companyName',
                    'location': '.companyLocation',
                    'salary': '.salary-snippet',
                    'url': '.jobTitle a'
                },
                description: 'Extract job listings from search results'
            }
        ];

        return {
            id: `indeed-search-${Date.now()}`,
            name: `Indeed: ${role} jobs`,
            sourceNote: note,
            actions,
            expectedOutcome: '5-20 job listings with role, company, location, salary'
        };
    }

    /**
     * Import scraped data as structured notes.
     * Converts raw Indeed data into notes with ontology-compliant properties.
     */
    importFromData(data: unknown, sourceNote: Note): Note[] {
        if (!Array.isArray(data)) return [];

        return data.map((job: any) => {
            const properties = [];

            // Map scraped fields to ontology properties
            if (job.role) {
                properties.push({
                    key: 'role',
                    operator: 'is' as const,
                    values: [this.cleanText(job.role)]
                });
            }

            if (job.company) {
                properties.push({
                    key: 'company',
                    operator: 'is' as const,
                    values: [this.cleanText(job.company)]
                });
            }

            if (job.location) {
                properties.push({
                    key: 'location',
                    operator: 'is' as const,
                    values: [this.cleanText(job.location)]
                });
            }

            if (job.salary) {
                properties.push({
                    key: 'salary',
                    operator: 'is' as const,
                    values: [this.cleanText(job.salary)]
                });
            }

            if (job.url) {
                properties.push({
                    key: 'url',
                    operator: 'is' as const,
                    values: [job.url]
                });
            }

            // Create note with full metadata
            return createNote({
                title: `${job.role || 'Job'} at ${job.company || 'Company'}`,
                content: `<p>Job listing found on Indeed.com</p>`,
                tags: ['job-listing', 'imported', 'indeed'],
                properties,

                // Provenance: Track where this came from
                source: {
                    type: 'skill',
                    identifier: this.id,
                    url: job.url,
                    timestamp: Date.now()
                },

                // Privacy: Imported data is private by default
                public: false,

                // Priority: Low priority for bulk imports (noise management)
                priority: 0.2
            });
        });
    }

    /**
     * Optional preview for user confirmation
     */
    preview(note: Note): string {
        const role = this.extractPropertyValue(note, ['role', 'skill', 'job']) || 'jobs';
        const location = this.extractPropertyValue(note, ['location']) || 'remote';

        return `Search Indeed.com for "${role}" positions in "${location}". Expected to find 5-20 job listings.`;
    }

    /**
     * Helper: Extract first matching property value
     */
    private extractPropertyValue(note: Note, keys: string[]): string | null {
        for (const prop of note.properties) {
            if (keys.includes(prop.key) && prop.values.length > 0) {
                return prop.values[0];
            }
        }
        return null;
    }

    /**
     * Helper: Clean extracted text
     */
    private cleanText(text: string): string {
        return text.trim().replace(/\s+/g, ' ');
    }
}
