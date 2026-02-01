import type { Skill, PropertyPattern, ActionSequence, BrowserAction, Note } from '../../../core/src/index';
import { createNote } from '../../../core/src/index';

export class GitHubSkill implements Skill {
    id = 'skill-github-v1';
    name = 'GitHub Repository Search';
    description = 'Search repositories on GitHub';
    version = '1.0.0';

    patterns: PropertyPattern[] = [
        {
            required: ['repository', 'repo', 'project', 'code', 'language'],
            optional: ['stars', 'forks', 'topic', 'license', 'updated'],
            minProperties: 1
        }
    ];

    canHandle(note: Note): number {
        const propertyKeys = new Set(note.properties.map(p => p.key));
        const text = note.title.toLowerCase();

        const hasGitHubKeywords = /github|repository|repo|opensource|code/.test(text);

        for (const pattern of this.patterns) {
            const hasRequiredKey = pattern.required.some(key => propertyKeys.has(key));
            if (!hasRequiredKey && !hasGitHubKeywords) continue;

            const matchedRequired = pattern.required.filter(key => propertyKeys.has(key)).length;
            const matchedOptional = pattern.optional.filter(key => propertyKeys.has(key)).length;
            const totalMatched = matchedRequired + matchedOptional;

            if (totalMatched >= pattern.minProperties || hasGitHubKeywords) {
                const confidence = Math.min(0.3 + (totalMatched * 0.15) + (hasGitHubKeywords ? 0.2 : 0), 1.0);
                return confidence;
            }
        }

        return 0;
    }

    exportToActions(note: Note): ActionSequence {
        const params = new URLSearchParams();

        for (const prop of note.properties) {
            switch (prop.key) {
                case 'repository':
                case 'repo':
                case 'project':
                    params.set('q', prop.values[0]);
                    break;
                case 'language':
                    params.append('q', `language:${prop.values[0]}`);
                    break;
                case 'topic':
                    params.append('q', `topic:${prop.values[0]}`);
                    break;
                case 'stars':
                    if (prop.operator === 'greater than' || prop.operator === '>') {
                        params.append('q', `stars:>${prop.values[0]}`);
                    }
                    break;
            }
        }

        if (!params.has('q')) {
            params.set('q', note.title);
        }

        const url = `https://github.com/search?type=repositories&${params.toString()}`;

        const actions: BrowserAction[] = [
            { type: 'navigate', url },
            {
                type: 'scrape',
                selector: '.repo-list-item',
                scrapeRules: {
                    name: 'h3 a',
                    description: '.mb-1',
                    stars: '[aria-label*="star"]',
                    language: '[itemprop="programmingLanguage"]',
                    url: 'h3 a@href',
                    topics: '.topic-tag'
                }
            }
        ];

        return {
            id: `${this.id}-${Date.now()}`,
            name: `GitHub: ${params.get('q')?.slice(0, 50) || 'search'}`,
            sourceNote: note,
            actions
        };
    }

    importFromData(scrapedData: unknown[], sourceNote: Note): Note[] {
        return (scrapedData as any[]).map((item, idx) =>
            createNote({
                title: item.name || `GitHub Repo ${idx + 1}`,
                properties: [
                    { key: 'repository', operator: 'is' as const, values: [item.name] },
                    ...(item.description ? [{ key: 'description', operator: 'is' as const, values: [item.description] }] : []),
                    ...(item.stars ? [{ key: 'stars', operator: 'is' as const, values: [item.stars] }] : []),
                    ...(item.language ? [{ key: 'language', operator: 'is' as const, values: [item.language] }] : []),
                    { key: 'source', operator: 'is' as const, values: ['github'] },
                    { key: 'url', operator: 'is' as const, values: [`https://github.com${item.url}`] }
                ],
                source: {
                    type: 'skill',
                    identifier: this.id,
                    url: `https://github.com${item.url}`,
                    timestamp: Date.now()
                },
                public: false,
                priority: 0.2
            })
        );
    }

    preview(note: Note): string {
        const repo = note.properties.find(p => ['repository', 'repo', 'project'].includes(p.key))?.values[0];
        const language = note.properties.find(p => p.key === 'language')?.values[0];
        return `Search repos "${repo || note.title}"${language ? ` (${language})` : ''}`;
    }
}
