import { Note } from '@notention/core/src/types';
import { Skill, SkillAction } from '../types';

export class TutorialSkill implements Skill {
    id = 'skill-tutorial';
    name = 'UI Tutorial Driver';
    description = 'Demonstrate how to use the UI by driving it using VoltBrowser';

    async export(note: Note): Promise<SkillAction | null> {
        // [tutorial:create-note]
        const content = note.content.toLowerCase();

        let actions: any[] = [];
        let tutorialName = 'Basic';

        // NOTE: In a real implementation, we would need to know the specific port the UI is running on
        // For now, assuming localhost:3000 as per standard React apps
        const baseUrl = 'http://localhost:3000';

        if (content.includes('create note') || content.includes('create-note')) {
            tutorialName = 'Create Note Demo';
            actions = [
                { type: 'wait', value: 2000 },
                { type: 'click', selector: '[data-testid="create-note-button"]' },
                { type: 'wait', value: 1000 },
                { type: 'type', selector: '[data-testid="note-editor"]', value: '# Hello from VoltAgent!\nI am demonstrating how to create a note.' },
                { type: 'wait', value: 2000 },
                { type: 'click', selector: '[data-testid="save-button"]' }
            ];
        } else if (content.includes('search')) {
            tutorialName = 'Search Demo';
            actions = [
                { type: 'wait', value: 2000 },
                { type: 'click', selector: '[data-testid="search-input"]' },
                { type: 'type', selector: '[data-testid="search-input"]', value: '@config' },
                { type: 'wait', value: 3000 }
            ];
        } else {
            // Default generic visit
            tutorialName = 'UI Visit';
            actions = [
                { type: 'wait', value: 2000 }
            ];
        }

        return {
            type: 'browser',
            url: baseUrl,
            interactions: actions,
            screenshot: 'full',
            // Explicitly allow localhost
            allowLocalhost: true
        };
    }

    async import(results: any): Promise<Note[]> {
        const data = results[0] || {};

        return [{
            id: crypto.randomUUID(),
            title: `Tutorial Complete`,
            content: `I have finished the tutorial sequence. See the screenshot for the final state.`,
            tags: ['@tutorial', '@result'],
            source: 'VoltBrowser',
            timestamp: Date.now(),
            attributes: {
                screenshot: data._screenshot
            }
        } as unknown as Note];
    }
}
