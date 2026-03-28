import { Note } from '@notention/core/src/types';
import { Skill, SkillAction } from '../types';
import { PropertyPattern, ActionSequence } from '@notention/core/src/skills/types';

export class IndeedSkill implements Skill {
    id = 'skill-indeed-search';
    name = 'Indeed Job Search';
    description = 'Search for jobs on Indeed based on note criteria';
    version = '1.0.0';
    patterns: PropertyPattern[] = [
        { required: ['role', 'location'] }
    ];

    canHandle(note: Note): number {
        const content = note.content.toLowerCase();
        if (content.includes('indeed') || (content.includes('job') && content.includes('search'))) {
            return 0.8;
        }
        return 0;
    }

    exportToActions(note: Note): ActionSequence {
        // Core implementation of exportToActions
        // This is required by the interface but we are primarily using the 'export' method for VoltAgent
        // For now, return a dummy sequence or reimplement logic here
         return {
            id: crypto.randomUUID(),
            name: 'Search Indeed',
            sourceNote: note as any,
            actions: []
        };
    }

    importFromData(data: unknown, sourceNote: Note): Note[] {
        // Core implementation of importFromData
        return [];
    }

    async export(note: Note): Promise<SkillAction | null> {
        // Extract search content from note
        // Example Note: "Find react jobs in SF" or [job:react] [location:SF]
        const content = note.content.toLowerCase();

        // Simple extraction for now - could be enhanced with an intent parser
        let q = '';
        let l = '';

        if (content.includes('react')) q = 'react developer';
        if (content.includes('node')) q = 'node.js developer';
        if (content.includes('engineer')) q = 'software engineer';

        if (content.includes('sf') || content.includes('san francisco')) l = 'San Francisco, CA';
        if (content.includes('remote')) l = 'Remote';

        // Fallback if semantic extraction fails, use full content
        if (!q) q = content;

        if (!q) return null;

        const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(l)}`;

        return {
            type: 'browser',
            url: url,
            extract: {
                jobs: '.job_seen_beacon', // General container, better to be specific if extracting list
                titles: 'h2.jobTitle span',
                companies: '[data-testid="company-name"]',
                locations: '[data-testid="text-location"]'
            },
            // Indeed often has lazy loading or popups, so wait a bit
            interactions: [
                { type: 'wait', value: 2000 }
            ],
            screenshot: 'full'
        };
    }

    async import(results: any): Promise<Note[]> {
        if (!results || !results[0]) return [];
        const data = results[0];

        const notes: Note[] = [];
        const screenshot = data._screenshot;

        // If we extracted lists
        const titles = data.titles || [];
        const companies = data.companies || [];
        const locations = data.locations || [];

        // Create a summary note
        notes.push({
            id: crypto.randomUUID(),
            title: 'Indeed Search Results',
            content: `Found ${titles.length} jobs.`,
            tags: ['@search-results', '@indeed'],
            source: 'VoltBrowser',
            timestamp: Date.now(),
            attributes: {
                screenshot: screenshot // Base64 string
            }
        } as unknown as Note);

        // Create individual job notes (limit to 5 to avoid spam)
        for (let i = 0; i < Math.min(titles.length, 5); i++) {
            notes.push({
                id: crypto.randomUUID(),
                title: titles[i],
                content: `Company: ${companies[i] || 'Unknown'}\nLocation: ${locations[i] || 'Unknown'}`,
                tags: ['@job', '@opportunity'],
                source: 'VoltBrowser',
                timestamp: Date.now(),
                attributes: {
                    company: companies[i],
                    location: locations[i]
                }
            } as unknown as Note);
        }

        return notes;
    }
}
