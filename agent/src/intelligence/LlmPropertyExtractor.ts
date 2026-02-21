import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Property } from '@notention/core';

// Define the schema for the output
const extractionSchema = z.object({
    properties: z.array(z.object({
        key: z.string().describe("The property key (e.g., 'budget', 'location', 'intent')"),
        operator: z.enum(['is', 'contains', '>', '<', '>=', '<=']).default('is'),
        values: z.array(z.string()).describe("List of values for the property")
    }))
});

export class LlmPropertyExtractor {
    private model = openai('gpt-4o');

    async extract(text: string): Promise<Property[]> {
        try {
            // @ts-ignore
            const { object } = await generateObject({
                model: this.model,
                schema: extractionSchema,
                prompt: `
                You are a 'Gardener' AI for a semantic note-taking app. 
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
                "${text}"
                
                Return the result as a list of properties.
                `
            });

            // Map to core Property type
            return object.properties.map(p => ({
                key: p.key,
                operator: p.operator as any, // Cast to valid operator
                values: p.values
            }));
        } catch (error) {
            console.error("LLM Extraction failed:", error);
            return [];
        }
    }
}
