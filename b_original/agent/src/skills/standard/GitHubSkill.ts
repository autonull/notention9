import { Note } from '@notention/core/src/types';
import { Skill, SkillAction } from '../types';

export class GitHubSkill implements Skill {
    id = 'skill-github-search';
    name = 'GitHub Repository Search';
    description = 'Search GitHub for repositories';

    async export(note: Note): Promise<SkillAction | null> {
        const content = note.content;
        const query = encodeURIComponent(content);

        return {
            type: 'browser',
            url: `https://github.com/search?q=${query}&type=repositories`,
            extract: {
                repos: '.search-title .v-align-middle',
                descriptions: '.search-match-desc' // This selector might drift, but OK for now
            },
            interactions: [
                { type: 'wait', value: 1500 }
            ],
            screenshot: 'full'
        };
    }

    async import(results: any): Promise<Note[]> {
        const data = results[0] || {};
        const repos = data.repos || [];

        const notes: Note[] = [];

        notes.push({
            id: crypto.randomUUID(),
            title: `GitHub Results: ${repos.length} found`,
            content: 'Search results from GitHub',
            tags: ['@github', '@search'],
            source: 'VoltBrowser',
            timestamp: Date.now(),
            attributes: { screenshot: data._screenshot }
        } as unknown as Note);

        for (let i = 0; i < Math.min(repos.length, 5); i++) {
            notes.push({
                id: crypto.randomUUID(),
                title: repos[i],
                content: `Repository found on GitHub`,
                tags: ['@repo'],
                source: 'VoltBrowser',
                timestamp: Date.now()
            } as unknown as Note);
        }
        return notes;
    }
}
