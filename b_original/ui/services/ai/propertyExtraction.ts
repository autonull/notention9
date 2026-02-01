import type { Property } from '@notention/core';
import type { AIProvider } from './types';
import type { OntologyNode } from '@notention/core';

/**
 * PropertyExtractionService converts natural language text into structured semantic properties.
 *
 * Examples:
 * - "Looking for React dev, max $80/hr, remote"
 *   → [role:is:React], [rate:<:80], [remote:is:true]
 *
 * - "Selling iPhone 13, $400, like new condition"
 *   → [product:is:iPhone 13], [price:is:400], [condition:is:Like New]
 *
 * - "Concert on Friday at 8pm, Madison Square Garden"
 *   → [startDateTime:is:Friday 8pm], [venue:is:Madison Square Garden]
 */
export class PropertyExtractionService {
    private aiProvider: AIProvider;
    private ontology: OntologyNode[];

    constructor(aiProvider: AIProvider, ontology: OntologyNode[]) {
        this.aiProvider = aiProvider;
        this.ontology = ontology;
    }

    /**
     * Extract properties from natural language text.
     * Returns structured Property objects ready to be added to a note.
     */
    async extractProperties(text: string): Promise<Property[]> {
        if (!text || text.trim().length < 5) {
            return [];
        }

        try {
            const prompt = this.buildExtractionPrompt(text);
            const response = await this.aiProvider.generateCompletion(prompt);

            return this.parsePropertiesFromResponse(response);
        } catch (error) {
            console.error('Property extraction failed:', error);
            return [];
        }
    }

    /**
     * Build a comprehensive prompt for property extraction
     */
    private buildExtractionPrompt(text: string): string {
        // Get sample property keys from ontology
        const sampleKeys = this.extractSampleKeys();

        return `Extract semantic properties from this text. Return ONLY a valid JSON array.

Text: "${text}"

Instructions:
1. Identify key-value pairs that match common semantic patterns
2. Use standard property keys when possible: ${sampleKeys.join(', ')}
3. Choose appropriate operators: "is", "contains", "greater than", "less than", "is near"
4. Extract numeric values without currency symbols

Output format (JSON array only, no markdown):
[
  {"key": "property-name", "operator": "is", "values": ["value"]},
  ...
]

Examples:
Input: "Looking for React developer, $100k+ salary, remote work"
Output: [
  {"key": "role", "operator": "contains", "values": ["React developer"]},
  {"key": "salary", "operator": "greater than", "values": ["100000"]},
  {"key": "remote", "operator": "is", "values": ["true"]}
]

Input: "Selling MacBook Pro 2021, $1200, excellent condition, NYC"
Output: [
  {"key": "product", "operator": "is", "values": ["MacBook Pro 2021"]},
  {"key": "price", "operator": "is", "values": ["1200"]},
  {"key": "condition", "operator": "is", "values": ["excellent"]},
  {"key": "location", "operator": "is", "values": ["NYC"]}
]

Now extract from the text above:`;
    }

    /**
     * Parse AI response into Property objects
     */
    private parsePropertiesFromResponse(response: string): Property[] {
        try {
            // Clean response - remove markdown code blocks if present
            let cleaned = response.trim();
            cleaned = cleaned.replace(/^```json?\s*/i, '');
            cleaned = cleaned.replace(/\s*```$/, '');
            cleaned = cleaned.trim();

            const parsed = JSON.parse(cleaned);

            if (!Array.isArray(parsed)) {
                console.warn('AI response is not an array');
                return [];
            }

            return parsed
                .filter(this.isValidProperty)
                .map(this.normalizeProperty);
        } catch (error) {
            console.error('Failed to parse properties from AI response:', error);
            console.debug('Raw response:', response);
            return [];
        }
    }

    /**
     * Validate that a parsed object is a valid property
     */
    private isValidProperty(obj: any): boolean {
        return (
            obj &&
            typeof obj === 'object' &&
            typeof obj.key === 'string' &&
            typeof obj.operator === 'string' &&
            Array.isArray(obj.values) &&
            obj.values.length > 0
        );
    }

    /**
     * Normalize a property to ensure consistent format
     */
    private normalizeProperty(obj: any): Property {
        return {
            key: obj.key.trim().toLowerCase(),
            operator: obj.operator as Property['operator'],
            values: obj.values.map((v: any) => String(v).trim())
        };
    }

    /**
     * Extract sample property keys from the ontology for prompt context
     */
    private extractSampleKeys(): string[] {
        const keys = new Set<string>();

        const traverse = (nodes: OntologyNode[]) => {
            for (const node of nodes) {
                if (node.attributes) {
                    Object.keys(node.attributes).forEach(key => keys.add(key));
                }
                if (node.children) {
                    traverse(node.children);
                }
            }
        };

        traverse(this.ontology);

        // Return most common/useful keys
        const commonKeys = [
            'role', 'skill', 'location', 'salary', 'price', 'name',
            'company', 'product', 'condition', 'startDateTime', 'venue',
            'remote', 'budget', 'rate', 'deadline', 'category'
        ];

        return commonKeys.filter(key => keys.has(key) || true).slice(0, 15);
    }
}

/**
 * Helper function to create a property extraction service with default config
 */
export function createPropertyExtractor(
    aiProvider: AIProvider,
    ontology: OntologyNode[]
): PropertyExtractionService {
    return new PropertyExtractionService(aiProvider, ontology);
}
