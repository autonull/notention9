import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Property } from '@notention/core';
import { getPrompt } from '@notention/core/prompts';

// Define the schema for the output
const extractionSchema = z.object({
    properties: z.array(z.object({
        key: z.string().describe("The property key (e.g., 'budget', 'location', 'intent')"),
        operator: z.enum(['is', 'contains', '>', '<', '>=', '<=']).default('is'),
        values: z.array(z.string()).describe("List of values for the property")
    }))
});

export class LlmPropertyExtractor {
    private model = openai('gpt-4o') as any;

    async extract(text: string): Promise<Property[]> {
        const promptDef = getPrompt('property-extraction', '1');
        const prompt = promptDef?.template
            ? promptDef.template.replace('{{text}}', text)
            : `Extract properties from: "${text}"`;

        try {
            // @ts-ignore
            const { object } = await generateObject({
                model: this.model,
                schema: extractionSchema,
                prompt,
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