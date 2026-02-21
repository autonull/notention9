import type {AIProvider, InferredAttribute, Note, OntologyNode} from '@notention/core';
import {Logger} from '@notention/core';
import {GoogleGenAI} from '@google/genai';

export const isGeminiApiKeyAvailable = (userKey?: string): boolean => {
    const key = userKey || process.env.API_KEY;
    return !!(key && key !== 'YOUR_GEMINI_API_KEY');
};

export class RemoteAIProvider implements AIProvider {
    name = 'Google Gemini';
    isAvailable: boolean;
    private client: GoogleGenAI | null = null;
    private modelName = 'gemini-1.5-flash';
    private logger = Logger.getInstance();

    constructor(apiKey?: string) {
        const key = apiKey || process.env.API_KEY;
        this.isAvailable = !!(key && key !== 'YOUR_GEMINI_API_KEY');
        if (this.isAvailable) {
            this.client = new GoogleGenAI({apiKey: key || ''});
        }
    }

    async generateCompletion(prompt: string): Promise<string> {
        if (!this.client) throw new Error('AI Provider not configured');

        try {
            const response = await this.client.models.generateContent({
                model: this.modelName,
                contents: prompt,
            });
            return response.text?.trim() || '';
        } catch (e) {
            this.logger.error('AI Generation Error:', e as Error);
            throw e;
        }
    }

    async suggestTags(text: string): Promise<string[]> {
        if (!this.client) throw new Error('AI Provider not configured');

        const prompt = `Analyze the following note content and suggest up to 5 relevant tags.
Return ONLY a valid JSON array of strings (e.g., ["tag1", "tag2"]).
Tags should be lowercase, single words or short phrases.

Note Content:
${text}`;

        try {
            const result = await this.generateCompletion(prompt);
            const jsonStr = result.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            return JSON.parse(jsonStr);
        } catch (e) {
            this.logger.error('Tag Suggestion Error:', e as Error);
            return [];
        }
    }

    async analyzeOntology(notes: Note[]): Promise<InferredAttribute[]> {
        if (!this.client) throw new Error('AI Provider not configured');

        // To avoid hitting context limits, we might only send a sample of notes or just their properties.
        const propertySummary = notes.map(n => {
            // Only send properties to save tokens
            return n.properties.map(p => `${p.key}: ${p.values.join(', ')}`).join('; ');
        }).filter(s => s).join('\n');

        const prompt = `Analyze the following list of property usages from a set of notes.
Infer a schema (ontology) for these properties.
For each unique property key, determine its likely data type (string, number, date, enum, geo) and provide a description.

Return ONLY a valid JSON array of objects with this structure:
{
  "key": "property_name",
  "type": "string|number|date|enum|geo",
  "description": "short description",
  "usageCount": number (estimate based on list),
  "sampleValues": ["val1", "val2"]
}

Data:
${propertySummary}`;

        try {
            const result = await this.generateCompletion(prompt);
            const jsonStr = result.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            return JSON.parse(jsonStr);
        } catch (e) {
            this.logger.error('Ontology Analysis Error:', e as Error);
            return [];
        }
    }

    async alignToOntology(text: string, ontology: OntologyNode[]): Promise<string[]> {
        if (!this.client) throw new Error('AI Provider not configured');

        // Build definitions list with types
        const definitions: string[] = [];
        const traverse = (nodes: OntologyNode[]) => {
            nodes.forEach(n => {
                if (n.attributes) {
                    Object.entries(n.attributes).forEach(([k, attr]) => {
                        definitions.push(`- ${k} (${attr.type}): ${attr.description || 'No description'}`);
                    });
                }
                if (n.children) traverse(n.children);
            });
        };
        traverse(ontology);
        const definitionsStr = definitions.join('\n');

        const prompt = `Analyze the text below and extract semantic properties in the format "[key:operator:value]".

Use the following known attributes (RESPECT THEIR TYPES):
${definitionsStr}

Guidelines:
1. If a known attribute is used, ensure the value matches its type.
   - For 'date', use YYYY-MM-DD.
   - For 'number', use plain numbers (e.g., 100, not "100 USD").
   - For 'geo', use "lat,lng".
2. If a new key is needed, create one that is concise and descriptive.
3. Valid operators: "is", "is not", "contains", "greater than", "less than".
   - Use "greater than" / "less than" for numbers/dates.
   - Use "contains" for text search or lists.
4. For "location" or other "geo" type fields, try to output latitude and longitude in the format "lat,lng" if possible.

Example output:
- ["[skill:is:React]", "[location:is:40.7128,-74.0060]", "[experience:greater than:5]"]

Return ONLY a valid JSON array of strings.

Text:
${text}`;

        try {
            const result = await this.generateCompletion(prompt);
            const jsonStr = result.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            return JSON.parse(jsonStr);
        } catch (e) {
            this.logger.error('Alignment Error:', e as Error);
            return [];
        }
    }

    async optimizeOntology(ontology: OntologyNode[]): Promise<{
        merged: { source: string, target: string }[],
        pruned: string[]
    }> {
        if (!this.client) throw new Error('AI Provider not configured');

        const knownKeys = new Set<string>();
        const traverse = (nodes: OntologyNode[]) => {
            nodes.forEach(n => {
                if (n.attributes) Object.keys(n.attributes).forEach(k => knownKeys.add(k));
                if (n.children) traverse(n.children);
            });
        };
        traverse(ontology);
        const keys = Array.from(knownKeys);

        if (keys.length === 0) return {merged: [], pruned: []};

        const prompt = `Analyze the following list of attribute keys from an ontology schema.
Identify potential optimizations, such as:
1. Merging synonymous keys (e.g., "cost" and "price").
2. Pruning keys that look like typos or are redundant.

Return a JSON object with two arrays:
"merged": Array of objects { "source": "old_key", "target": "new_key" }
"pruned": Array of strings (keys to remove)

Keys:
${keys.join(', ')}`;

        try {
            const result = await this.generateCompletion(prompt);
            const jsonStr = result.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            return JSON.parse(jsonStr);
        } catch (e) {
            this.logger.error('Optimization Error:', e as Error);
            return {merged: [], pruned: []};
        }
    }
}
