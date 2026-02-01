import { Property } from './types/index.js';
import type { Quantity } from './quantities.js';
import { OntologyService } from './ontologyService.js';
import { DEFAULT_ONTOLOGY } from './ontology.default.js';
import { PropertyValidationError } from './errorTypes.js';
import { parseQuantity } from './quantities.js';

/**
 * PropertyExtractor - Extract ontology properties from natural language
 *
 * Uses ontology metadata to intelligently parse text and extract semantic properties.
 */

export class PropertyExtractor {
    private ontologyService: OntologyService;

    // Common operator phrases mapped to ontology operators
    private operatorPhrases: Map<string, string> = new Map([
        ['send to', 'send to'],
        ['message to', 'send to'],
        ['via', 'is'],
        ['using', 'is'],
        ['from', 'is'],
        ['at', 'is'],
        ['near', 'is near'],
        ['before', 'less than'],
        ['after', 'greater than'],
        ['is', 'is'],
        ['equals', 'is'],
        ['contains', 'contains']
    ]);

    constructor(ontology = DEFAULT_ONTOLOGY) {
        this.ontologyService = new OntologyService(ontology);
    }

    /**
     * Extract properties from natural language text
     */
    extractFromText(text: string): Property[] {
        const properties: Property[] = [];
        const lower = text.toLowerCase();

        // Apply extraction strategies in sequence
        this.applySendToStrategy(text, properties);
        this.applyChannelStrategy(text, properties);
        this.applyPhoneStrategy(text, properties);
        this.applyEmailStrategy(text, properties);
        this.applyLocationStrategy(text, properties);
        this.applyDateStrategy(text, properties);
        this.applyFuzzyMatchingStrategy(text, properties);

        return properties;
    }

    /**
     * Strategy 1: Match "send to [contact]"
     */
    private applySendToStrategy(text: string, properties: Property[]): void {
        const lower = text.toLowerCase();
        const sendMatch = lower.match(/(?:send|message)\s+(?:to|)\s+([+\w@#-]+)/);
        if (sendMatch) {
            properties.push({
                key: 'to',
                operator: 'send to',
                values: [sendMatch[1]]
            });
        }
    }

    /**
     * Strategy 2: Match "via/using [channel]"
     */
    private applyChannelStrategy(text: string, properties: Property[]): void {
        const lower = text.toLowerCase();
        const channelMatch = lower.match(/(?:via|using|on|through)\s+(\w+)/);
        if (channelMatch) {
            const channel = channelMatch[1];
            // Validate against ontology enum
            const enumOptions = this.ontologyService.getEnumOptions('channel');
            if (enumOptions && enumOptions.includes(channel)) {
                properties.push({
                    key: 'channel',
                    operator: 'is',
                    values: [channel]
                });
            }
        }
    }

    /**
     * Strategy 3: Match phone numbers
     */
    private applyPhoneStrategy(text: string, properties: Property[]): void {
        const phoneMatch = text.match(/(\+?\d{10,15})/);
        if (phoneMatch && !properties.some(p => p.key === 'to')) {
            properties.push({
                key: 'from', // Assume incoming if no "send to"
                operator: 'is',
                values: [phoneMatch[1]]
            });
        }
    }

    /**
     * Strategy 4: Match email addresses
     */
    private applyEmailStrategy(text: string, properties: Property[]): void {
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
            properties.push({
                key: 'email',
                operator: 'is',
                values: [emailMatch[1]]
            });
        }
    }

    /**
     * Strategy 5: Match locations (basic)
     */
    private applyLocationStrategy(text: string, properties: Property[]): void {
        const locationKeywords = ['near', 'in', 'at'];

        // Cache regex patterns to avoid recreating them
        for (const keyword of locationKeywords) {
            const regex = new RegExp(`${keyword}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'gi');
            const matches = text.match(regex);
            if (matches) {
                // Extract the location name by removing the keyword prefix
                const location = matches[0].replace(new RegExp(`^${keyword}\\s+`, 'i'), '').trim();
                properties.push({
                    key: 'location',
                    operator: 'is near',
                    values: [location]
                });
                break;
            }
        }
    }

    /**
     * Strategy 6: Match datetime references
     */
    private applyDateStrategy(text: string, properties: Property[]): void {
        const datePatterns = [
            { regex: /tomorrow/i, offset: 1 },
            { regex: /today/i, offset: 0 },
            { regex: /yesterday/i, offset: -1 }
        ];

        for (const pattern of datePatterns) {
            if (pattern.regex.test(text)) {
                const date = new Date();
                date.setDate(date.getDate() + pattern.offset);
                properties.push({
                    key: 'date',
                    operator: 'is',
                    values: [date.toISOString().split('T')[0]]
                });
                break;
            }
        }
    }

    /**
     * Strategy 7: Fuzzy attribute matching for remaining words
     */
    private applyFuzzyMatchingStrategy(text: string, properties: Property[]): void {
        const words = text.split(/\s+/).filter(w => w.length > 3);
        const existingKeys = new Set(properties.map(p => p.key)); // Use Set for faster lookup

        for (const [index, word] of words.entries()) {
            const matches = this.ontologyService.getFuzzyMatches(word, 1);
            if (matches.length > 0 && !existingKeys.has(matches[0])) {
                // Only add if we can infer a value
                const nextWord = words[index + 1];
                if (nextWord && nextWord.length > 2) {
                    properties.push({
                        key: matches[0],
                        operator: 'contains',
                        values: [nextWord]
                    });
                    existingKeys.add(matches[0]); // Add to set to avoid duplicates
                }
            }
        }
    }

    /**
     * Infer property type from value string
     */
    inferType(value: string): string {
        // Check if it's a quantity with units
        const quantity = this.parseQuantityValue(value);
        if (quantity) {
            return 'quantity';
        }

        // Number
        if (/^-?\d+(\.\d+)?$/.test(value)) return 'number';

        // Date (ISO format)
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';

        // Datetime (ISO format)
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return 'datetime';

        // Geo coordinates
        if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(value)) return 'geo';

        // Email
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'string'; // Could be email type

        // Phone
        if (/^\+?\d{10,15}$/.test(value)) return 'string';

        // Default
        return 'string';
    }

    /**
     * Parse quantity value from string
     */
    parseQuantityValue(value: string): Quantity | null {
        return parseQuantity(value);
    }

    /**
     * Validate property against ontology
     */
    validateProperty(property: Property): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check if attribute exists
        if (!this.ontologyService.hasAttribute(property.key)) {
            errors.push(`Attribute '${property.key}' not found in ontology`);
        } else {
            // Check if operator is valid for this attribute
            const validOps = this.ontologyService.getValidOperators(property.key);
            if (!validOps.includes(property.operator)) {
                errors.push(`Operator '${property.operator}' not valid for '${property.key}'`);
            }

            // Check enum values
            const enumOptions = this.ontologyService.getEnumOptions(property.key);
            if (enumOptions) {
                for (const value of property.values) {
                    if (!enumOptions.includes(value)) {
                        errors.push(`Value '${value}' not in enum options for '${property.key}'`);
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate property against ontology, throwing an error if invalid
     */
    validatePropertyOrThrow(property: Property): void {
        const { valid, errors } = this.validateProperty(property);
        if (!valid) {
            throw new PropertyValidationError(errors.join('; '));
        }

        // If the property has a quantity, validate it as well
        if (property.quantity) {
            this.validateQuantity(property.quantity, property.key);
        }
    }

    /**
     * Validate quantity based on property key
     */
    private validateQuantity(quantity: Quantity, propertyKey: string): void {
        // Check if this is a price vs rate property
        if (propertyKey.includes('price') || propertyKey.includes('budget')) {
            if (quantity.unitType === 'compound' && !propertyKey.includes('Rate')) {
                // Simple price shouldn't be a compound unit
                console.warn(`Warning: Property ${propertyKey} appears to be a simple price but has a compound unit: ${quantity.unit}`);
            } else if (quantity.unitType === 'simple' && propertyKey.includes('Rate')) {
                // Rate should typically be a compound unit
                console.warn(`Warning: Property ${propertyKey} appears to be a rate but has a simple unit: ${quantity.unit}`);
            }
        }
    }

    /**
     * Expand properties using ontology context
     * For example, if 'from' includes a phone, also suggest 'channel: whatsapp'
     */
    expandContext(properties: Property[]): Property[] {
        const expanded = [...properties];

        // If we have a phone number but no channel, suggest whatsapp
        const hasPhone = properties.some(p =>
            p.key === 'from' || p.key === 'to'
        );
        const hasChannel = properties.some(p => p.key === 'channel');

        if (hasPhone && !hasChannel) {
            expanded.push({
                key: 'channel',
                operator: 'is',
                values: ['whatsapp']
            });
        }

        return expanded;
    }

    /**
     * Get ontology service for additional queries
     */
    getOntologyService(): OntologyService {
        return this.ontologyService;
    }
}
