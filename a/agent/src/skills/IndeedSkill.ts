import { Skill, PropertyPattern, ActionSequence, BrowserAction } from '../../../core/src/skills/types';
import { Note } from '../../../core/src/types/index';
import { createNote } from '../../../core/src/index';

export class IndeedSkill implements Skill {
  id = 'skill-indeed-v1';
  name = 'Indeed Job Board';
  description = 'Search and import job listings from Indeed.com';
  version = '1.0.0';

  patterns: PropertyPattern[] = [
      {
          required: ['role', 'skill', 'job', 'hiring'],
          optional: ['location', 'salary', 'rate', 'company'],
          minProperties: 1
      }
  ];

  canHandle(note: Note): number {
      const hasJobIntent = note.properties.some(p =>
        ['role', 'skill', 'job', 'hiring'].includes(p.key)
      );
      return hasJobIntent ? 0.8 : 0;
  }

  // MoltBot / Core implementation
  exportToActions(note: Note): ActionSequence {
    // Extract query
    const roleProp = note.properties.find(p => ['role', 'job', 'skill'].includes(p.key));
    const locationProp = note.properties.find(p => p.key === 'location');

    const query = roleProp?.values[0] || 'software engineer';
    const location = locationProp?.values[0] || 'remote';

    const url = `https://indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;

    const actions: BrowserAction[] = [
        { type: 'navigate', url },
        {
            type: 'scrape',
            selector: '.job_seen_beacon',
            scrapeRules: {
                role: '.jobTitle span',
                company: '.companyName',
                location: '.companyLocation',
                salary: '.salary-snippet',
                url: '.jobTitle a@href'
            }
        }
    ];

    return {
        id: `${this.id}-${Date.now()}`,
        name: `Indeed: ${query} in ${location}`,
        sourceNote: note,
        actions
    };
  }

  importFromData(scrapedData: unknown[], sourceNote: Note): Note[] {
      const jobs = Array.isArray(scrapedData) ? scrapedData : [];

      return jobs.map((job: any, idx: number) =>
          createNote({
            title: `Job: ${job.role || 'Unknown Role'} at ${job.company || 'Unknown Company'}`,
            content: `<p>${job.role} at ${job.company}</p><p>${job.location}</p>`,
            tags: ['job-listing', 'imported'],
            properties: [
              { key: 'role', operator: 'is', values: [job.role || ''] },
              { key: 'company', operator: 'is', values: [job.company || ''] },
              { key: 'location', operator: 'is', values: [job.location || ''] },
              ...(job.salary ? [{ key: 'salary', operator: 'is' as const, values: [job.salary] }] : []),
              { key: 'source', operator: 'is', values: ['indeed'] },
              { key: 'url', operator: 'is', values: [job.url ? `https://indeed.com${job.url}` : ''] }
            ],
            source: {
              type: 'skill',
              identifier: this.id,
              timestamp: Date.now()
            },
            public: false,
            priority: 0.2
          })
      );
  }

  // VoltAgent helpers (aliases)
  async export(note: Note): Promise<any> {
      const seq = this.exportToActions(note);
      return {
          type: 'browser_action',
          payload: seq.actions
      };
  }

  async import(results: any): Promise<Note[]> {
      return this.importFromData(results, {} as Note);
  }
}
