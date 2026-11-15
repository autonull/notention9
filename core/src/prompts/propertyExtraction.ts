import { registerPrompt, type PromptDefinition } from './registry.js';

export const PROPERTY_EXTRACTION_PROMPT: PromptDefinition = {
    id: 'property-extraction',
    version: '1',
    template: `You are a precise semantic property extraction system. Output ONLY a JSON array. Do not explain.

Extract semantic properties from the following text:
"{{text}}"

Return the result as a JSON array of properties, each with: key, operator, values.`,
};

registerPrompt(PROPERTY_EXTRACTION_PROMPT);