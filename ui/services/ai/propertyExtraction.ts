import { Property, PropertyExtractor } from '@notention/core';

/**
 * Enhanced Property Extraction Service
 * Wraps the core rule-based extraction with AI capabilities (mocked or real)
 */
export class PropertyExtractionService {
    private coreExtractor: PropertyExtractor;

    constructor() {
        this.coreExtractor = new PropertyExtractor();
    }

    /**
     * Extract semantic properties from text.
     * Combines rule-based extraction with (future) AI inference.
     */
    async extractProperties(text: string): Promise<Property[]> {
        // 1. Run local fast rule-based extraction
        const properties = this.coreExtractor.extractFromText(text);

        // 2. (Future) Call AI service for subtle semantics
        // const aiProperties = await this.callAiExtractor(text);
        // properties.push(...aiProperties);

        return properties;
    }

    /**
     * Infer suggestions based on partial input
     * Useful for auto-complete in PropertyWidget
     */
    async getSuggestions(partialKey: string): Promise<string[]> {
        // Mock suggestions based on common ontology keys
        const COMMON_KEYS = ['role', 'rate', 'location', 'skill', 'deadline', 'priority', 'status', 'company'];
        return COMMON_KEYS.filter(k => k.toLowerCase().includes(partialKey.toLowerCase()));
    }
}

export const propertyExtractionService = new PropertyExtractionService();
