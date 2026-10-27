import { registerPrompt, type PromptDefinition } from './registry.js';

export const PROPERTY_EXTRACTION_PROMPT: PromptDefinition = {
    id: 'property-extraction',
    version: '1',
    template: `You are a 'Gardener' AI for a semantic note-taking app.
Your goal is to extract structured properties from the user's raw text note.

The ontology keys usually include:
- intent (task, reminder, purchase, etc.)
- status (pending, done)
- priority (high, medium, low)
- topic (tech, philosophy, etc.)
- people (mentions of names)
- location
- date/time

Extract semantic properties from the following text:
"{{text}}"

Return the result as a list of properties.`,
};

registerPrompt(PROPERTY_EXTRACTION_PROMPT);