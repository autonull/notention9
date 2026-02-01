import { ProposedThought, AIProvider } from '../types/index.js';

interface LifeTemplate {
  ontology: string;
  prompt: string;
}

const LIFE_TEMPLATES: Record<string, LifeTemplate[]> = {
  health: [
    { ontology: 'wellbeing.sleep', prompt: "What time did you actually fall asleep last night?" },
    { ontology: 'wellbeing.nutrition', prompt: "What's one food you'd eat less of this week?" },
    { ontology: 'wellbeing.exercise', prompt: "What's a physical activity you actually enjoy?" }
  ],
  work: [
    { ontology: 'career.blocker', prompt: "What's the one task you've been avoiding?" },
    { ontology: 'career.growth', prompt: "What skill would make your job 20% easier?" },
    { ontology: 'career.balance', prompt: "When do you feel most drained at work?" }
  ],
  finances: [
    { ontology: 'finance.savings', prompt: "What's one subscription you could cancel?" },
    { ontology: 'finance.income', prompt: "What's one way you could increase your income this month?" },
    { ontology: 'finance.debt', prompt: "Which debt stresses you out the most?" }
  ],
  relationships: [
    { ontology: 'relationship.connection', prompt: "Who have you been meaning to reach out to?" },
    { ontology: 'relationship.conflict', prompt: "Is there a conversation you've been putting off?" },
    { ontology: 'relationship.boundaries', prompt: "Where do you need to say 'no' more often?" }
  ],
  existential: [
    { ontology: 'life.purpose', prompt: "What's keeping you awake at 3am?" },
    { ontology: 'life.joy', prompt: "When was the last time you felt truly alive?" },
    { ontology: 'life.legacy', prompt: "What do you want to be remembered for?" }
  ]
};

export class LifeDecomposer {
  private aiProvider?: AIProvider;

  constructor(aiProvider?: AIProvider) {
    this.aiProvider = aiProvider;
  }

  decompose(rawIntent: string): ProposedThought[] {
    const intent = rawIntent.toLowerCase();
    const proposed: ProposedThought[] = [];

    // Heuristic matching for domain selection
    const domainsToInclude = new Set<string>();

    const patterns = {
        health: /health|diet|sleep|tired|energy|fit|pain|sick|gym|exercise|weight/,
        work: /work|job|career|busy|stress|boss|project|deadline|task|meeting/,
        finances: /money|finance|cost|save|spend|debt|bill|salary|income|broke/,
        relationships: /relationship|friend|family|love|partner|lonely|social|kids|parent/,
        existential: /life|purpose|meaning|future|death|sad|happy|why|god|spirit/
    };

    if (patterns.health.test(intent)) domainsToInclude.add('health');
    if (patterns.work.test(intent)) domainsToInclude.add('work');
    if (patterns.finances.test(intent)) domainsToInclude.add('finances');
    if (patterns.relationships.test(intent)) domainsToInclude.add('relationships');
    if (patterns.existential.test(intent)) domainsToInclude.add('existential');

    // Default: "Fix my life" or generic queries -> return top picks from major domains
    if (domainsToInclude.size === 0 || intent.includes('fix my life') || intent.includes('help')) {
        domainsToInclude.add('health');
        domainsToInclude.add('work');
        domainsToInclude.add('finances');
        domainsToInclude.add('relationships');
    }

    domainsToInclude.forEach(domain => {
        const templates = LIFE_TEMPLATES[domain];
        if (templates) {
            templates.forEach(template => {
                 proposed.push({
                    ontology: template.ontology,
                    status: 'proposed',
                    content: template.prompt,
                    sovereignty: 'local',
                    source: 'decomposer:v1'
                });
            });
        }
    });

    // Limit to prevent overwhelm (max 4 initially as per plan)
    if (proposed.length > 4) {
        const diverse: ProposedThought[] = [];
        const domainsArray = Array.from(domainsToInclude);

        // Round robin selection
        let i = 0;
        while (diverse.length < 4 && i < 10) { // Safety break
             const domain = domainsArray[i % domainsArray.length];
             const templates = LIFE_TEMPLATES[domain];
             // Simple logic: pick index based on round
             const templateIndex = Math.floor(i / domainsArray.length);
             if (templates && templateIndex < templates.length) {
                 diverse.push({
                    ontology: templates[templateIndex].ontology,
                    status: 'proposed',
                    content: templates[templateIndex].prompt,
                    sovereignty: 'local',
                    source: 'decomposer:v1'
                 });
             }
             i++;
             if (diverse.length >= 4) break;
        }
        return diverse;
    }

    return proposed;
  }

  async decomposeWithAI(rawIntent: string): Promise<ProposedThought[]> {
      if (!this.aiProvider) {
          console.warn('LifeDecomposer: No AI Provider, falling back to regex.');
          return this.decompose(rawIntent);
      }

      const prompt = `
Analyze the user's intent: "${rawIntent}"

Decompose this into 3-5 specific, actionable sub-problems or reflection questions.
Assign a specific ontology category (e.g., 'wellbeing.sleep', 'career.growth', 'finance.savings') to each.

Return ONLY a JSON array of objects with the format:
[
  { "ontology": "category.subcategory", "content": "Question or sub-problem" }
]
`;

      try {
          const response = await this.aiProvider.generateCompletion(prompt);
          // Clean code blocks if present
          const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          if (Array.isArray(parsed)) {
              return parsed.map((item: any) => ({
                  ontology: item.ontology,
                  content: item.content,
                  status: 'proposed',
                  sovereignty: 'local',
                  source: 'decomposer:ai'
              }));
          }
      } catch (error) {
          console.error('LifeDecomposer: AI decomposition failed', error);
      }

      return this.decompose(rawIntent);
  }
}
