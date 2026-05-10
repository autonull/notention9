import type { Note, Property } from '../types/index.js';
import type { Skill, PropertyPattern, ActionSequence } from './types.js';

/**
 * GitHubSkill - Repository Search
 */
export class GitHubSkill implements Skill {
    id = 'skill-github-search';
    name = 'GitHub Repository Search';
    description = 'Search GitHub for repositories';
    version = '1.0.0';

    patterns: PropertyPattern[] = [
        {
            required: ['query'],
            minProperties: 1
        }
    ];

    canHandle(note: Note): number {
        const content = note.content.toLowerCase();
        if (content.includes('github') || content.includes('repo')) return 0.8;
        return 0;
    }

    exportToActions(note: Note): ActionSequence {
        const content = note.content;
        const query = encodeURIComponent(content);

        return {
            id: `github-search-${Date.now()}`,
            name: `Search GitHub for ${content}`,
            sourceNote: note,
            actions: [
                {
                    type: 'navigate',
                    url: `https://github.com/search?q=${query}&type=repositories`,
                    description: `Navigate to GitHub search`
                },
                {
                    type: 'wait',
                    duration: 1500,
                    description: 'Wait for results'
                },
                {
                    type: 'scrape',
                    scrapeRules: {
                        repos: '.search-title .v-align-middle',
                        descriptions: '.search-match-desc'
                    },
                    description: 'Extract repositories'
                },
                {
                    type: 'screenshot',
                    fullPage: true,
                    description: 'Capture search results'
                }
            ],
            expectedOutcome: 'List of GitHub repositories'
        };
    }

    importFromData(data: unknown, sourceNote: Note): Note[] {
        if (!Array.isArray(data) || data.length === 0) return [];
        const result = data[0];

        const repos = result.repos || [];
        const descriptions = result.descriptions || [];
        const screenshot = result._screenshot;

        const notes: Note[] = [];

        // Summary
        notes.push({
            id: crypto.randomUUID(),
            title: `GitHub Results: ${repos.length} found`,
            content: 'Search results from GitHub',
            tags: ['@github', '@search'],
            properties: [
                { key: 'count', operator: 'is', values: [repos.length.toString()] }
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

        // Details
        const repoNotes = repos.slice(0, 5).map((repo: string, i: number) => ({
            id: crypto.randomUUID(),
            title: repo,
            content: descriptions[i] || 'No description',
            tags: ['@repo', '@github'],
            properties: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: {
                type: 'skill',
                identifier: this.id,
                timestamp: Date.now()
            },
            privacy: 'private',
            priority: 0.5
        }) as Note);

        return [...notes, ...repoNotes];
    }
}
