import {Logger, Property, PropertyExtractor} from '@notention/core';
import {WebLLMProvider} from './WebLLMProvider';

/**
 * Enhanced Property Extraction Service
 * Wraps the core rule-based extraction with AI capabilities
 */
export class PropertyExtractionService {
    private coreExtractor: PropertyExtractor;
    private llmProvider: WebLLMProvider;
    private logger = Logger.getInstance();

    constructor() {
        this.coreExtractor = new PropertyExtractor();
        this.llmProvider = new WebLLMProvider();
    }

    /**
     * Extract semantic properties from text.
     * Combines rule-based extraction with AI inference if available.
     */
    async extractProperties(text: string, useAI: boolean = false): Promise<Property[]> {
        // 1. Run local fast rule-based extraction
        const properties = this.coreExtractor.extractFromText(text);

        // 2. Call AI service for subtle semantics if enabled
        if (useAI) {
            try {
                // Check availability (lazy check usually, but good to wrap)
                // WebLLMProvider might need initialization.
                // suggestTags returns strings like "[key:op:value]"
                const aiTags = await this.llmProvider.suggestTags(text);

                // Parse AI tags into Property objects
                const {parseProperties} = await import('@notention/core');

                aiTags.forEach(tag => {
                    const parsed = parseProperties(tag);
                    if (parsed.length > 0) {
                        const p = parsed[0];
                        // Deduplicate: Don't add if exact key/value exists
                        const exists = properties.some(ex =>
                            ex.key === p.key && ex.values.join(',') === p.values.join(',')
                        );
                        if (!exists) {
                            properties.push(p);
                        }
                    }
                });
            } catch (e) {
                this.logger.warn("AI extraction failed, falling back to rules only", e instanceof Error ? e : new Error(String(e)));
            }
        }

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
