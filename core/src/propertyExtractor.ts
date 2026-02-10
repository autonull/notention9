import { Property, Quantity } from './types/index.js';
import { OntologyService } from './ontologyService.js';
import { DEFAULT_ONTOLOGY } from './ontology.default.js';
import { PropertyValidationError } from './errorTypes.js';
import { parseQuantity } from './quantities.js';
import { Logger } from './utils/logging.js';

const INTENTS = [
    { key: 'reminder', regex: /remind.*me.*(to|about|that).*|set.*reminder/i },
    { key: 'schedule', regex: /schedule|book|plan|arrange.*for|appointment.*with/i },
    { key: 'communication', regex: /email|send.*message|text|call|contact.*about/i },
    { key: 'task', regex: /todo|to-do|task|do.*later|need.*to|want.*to/i }, // Added broad "need/want to"
    { key: 'shopping', regex: /buy|purchase|order|get.*from|shop.*for/i },
    { key: 'health', regex: /medication|take.*pill|doctor.*appointment|exercise|workout/i }
];

const LOCATION_KEYWORDS = ['near', 'in', 'at'];
const LOCATION_PATTERNS = LOCATION_KEYWORDS.map(k => ({
    regex: new RegExp(`${k}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'gi'),
    prefix: new RegExp(`^${k}\\s+`, 'i')
}));

const DATE_PATTERNS = [
    { regex: /tomorrow/i, offset: 1 },
    { regex: /today/i, offset: 0 },
    { regex: /yesterday/i, offset: -1 }
];

const BUDGET_REGEX = /(?:\$|USD\s*)(\d+(?:,\d{3})*(?:\.\d+)?)|(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:USD|dollars?)/i;

const STOP_WORDS = new Set(['with', 'the', 'and', 'for', 'from', 'near', 'about', 'that', 'this']);

export class PropertyExtractor {
    private ontologyService: OntologyService;
    private logger: Logger;

    // Strategies are bound arrow functions to ensure correct 'this' context and avoid recreation
    private strategies = [
        (text: string, properties: Property[]) => this.applyIntentStrategy(text, properties),
        (text: string, properties: Property[]) => this.applySendToStrategy(text, properties),
        (text: string, properties: Property[]) => this.applyChannelStrategy(text, properties),
        (text: string, properties: Property[]) => this.applyPhoneStrategy(text, properties),
        (text: string, properties: Property[]) => this.applyEmailStrategy(text, properties),
        (text: string, properties: Property[]) => this.applyLocationStrategy(text, properties),
        (text: string, properties: Property[]) => this.applyDateStrategy(text, properties),
        (text: string, properties: Property[]) => this.applyBudgetStrategy(text, properties),
        (text: string, properties: Property[]) => this.applyFuzzyMatchingStrategy(text, properties)
    ];

    constructor(ontology = DEFAULT_ONTOLOGY) {
        this.ontologyService = new OntologyService(ontology);
        this.logger = Logger.getInstance();
    }

    extractFromText(text: string): Property[] {
        const properties: Property[] = [];
        this.strategies.forEach(strategy => strategy(text, properties));
        return properties;
    }

    private applyIntentStrategy(text: string, properties: Property[]): void {
        for (const intent of INTENTS) {
            if (intent.regex.test(text) && !properties.some(p => p.key === 'intent' && p.values.includes(intent.key))) {
                properties.push({ key: 'intent', operator: 'is', values: [intent.key] });
            }
        }
    }

    private applySendToStrategy(text: string, properties: Property[]): void {
        const match = text.toLowerCase().match(/(?:send|message)\s+(?:to|)\s+([+\w@#-]+)/);
        if (match) {
            properties.push({ key: 'to', operator: 'send to', values: [match[1]] });
        }
    }

    private applyChannelStrategy(text: string, properties: Property[]): void {
        const match = text.toLowerCase().match(/(?:via|using|on|through)\s+(\w+)/);
        if (match) {
            const channel = match[1];
            if (this.ontologyService.getEnumOptions('channel')?.includes(channel)) {
                properties.push({ key: 'channel', operator: 'is', values: [channel] });
            }
        }
    }

    private applyPhoneStrategy(text: string, properties: Property[]): void {
        const match = text.match(/(\+?\d{10,15})/);
        if (match && !properties.some(p => p.key === 'to')) {
            properties.push({ key: 'from', operator: 'is', values: [match[1]] });
        }
    }

    private applyEmailStrategy(text: string, properties: Property[]): void {
        const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (match) {
            properties.push({ key: 'email', operator: 'is', values: [match[1]] });
        }
    }

    private applyLocationStrategy(text: string, properties: Property[]): void {
        for (const { regex, prefix } of LOCATION_PATTERNS) {
            const matches = text.match(regex);
            if (matches) {
                const location = matches[0].replace(prefix, '').trim();
                properties.push({ key: 'location', operator: 'is near', values: [location] });
                break;
            }
        }
    }

    private applyDateStrategy(text: string, properties: Property[]): void {
        for (const pattern of DATE_PATTERNS) {
            if (pattern.regex.test(text)) {
                const date = new Date();
                date.setDate(date.getDate() + pattern.offset);
                properties.push({ key: 'date', operator: 'is', values: [date.toISOString().split('T')[0]] });
                break;
            }
        }
    }

    private applyBudgetStrategy(text: string, properties: Property[]): void {
        const match = text.match(BUDGET_REGEX);
        if (match) {
            const amount = match[1] || match[2];
            // Normalize amount by removing commas
            const normalizedAmount = amount.replace(/,/g, '');
            properties.push({ key: 'budget', operator: 'is', values: [normalizedAmount] });
        }
    }

    private applyFuzzyMatchingStrategy(text: string, properties: Property[]): void {
        const words = text.split(/\s+/).filter(w => w.length > 3);
        const existingKeys = new Set(properties.map(p => p.key));

        for (const [index, word] of words.entries()) {
            const matches = this.ontologyService.getFuzzyMatches(word, 1);
            if (matches.length > 0 && !existingKeys.has(matches[0])) {
                const nextWord = words[index + 1];
                if (nextWord?.length > 2 && !STOP_WORDS.has(nextWord.toLowerCase())) {
                    properties.push({ key: matches[0], operator: 'contains', values: [nextWord] });
                    existingKeys.add(matches[0]);
                }
            }
        }
    }

    inferType(value: string): string {
        if (this.parseQuantityValue(value)) return 'quantity';
        if (/^-?\d+(\.\d+)?$/.test(value)) return 'number';
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return 'datetime';
        if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(value)) return 'geo';
        return 'string';
    }

    parseQuantityValue(value: string): Quantity | null {
        return parseQuantity(value);
    }

    validateProperty(property: Property): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const { key, operator, values } = property;

        if (!this.ontologyService.hasAttribute(key)) {
            return { valid: false, errors: [`Attribute '${key}' not found in ontology`] };
        }

        if (!this.ontologyService.getValidOperators(key).includes(operator)) {
            errors.push(`Operator '${operator}' not valid for '${key}'`);
        }

        const enumOptions = this.ontologyService.getEnumOptions(key);
        if (enumOptions) {
            values.forEach(v => {
                if (!enumOptions.includes(v)) errors.push(`Value '${v}' not in enum options for '${key}'`);
            });
        }

        return { valid: errors.length === 0, errors };
    }

    validatePropertyOrThrow(property: Property): void {
        const { valid, errors } = this.validateProperty(property);
        if (!valid) throw new PropertyValidationError(errors.join('; '));
        if (property.quantity) this.validateQuantity(property.quantity, property.key);
    }

    private validateQuantity(quantity: Quantity, propertyKey: string): void {
        const isRate = propertyKey.includes('Rate');
        const isPrice = propertyKey.includes('price') || propertyKey.includes('budget');

        if (isPrice) {
            if (quantity.unitType === 'compound' && !isRate) {
                this.logger.warn(`Property ${propertyKey} appears to be a simple price but has a compound unit: ${quantity.unit}`);
            } else if (quantity.unitType === 'simple' && isRate) {
                this.logger.warn(`Property ${propertyKey} appears to be a rate but has a simple unit: ${quantity.unit}`);
            }
        }
    }

    expandContext(properties: Property[]): Property[] {
        const expanded = [...properties];
        const hasPhone = properties.some(p => p.key === 'from' || p.key === 'to');
        const hasChannel = properties.some(p => p.key === 'channel');

        if (hasPhone && !hasChannel) {
            expanded.push({ key: 'channel', operator: 'is', values: ['whatsapp'] });
        }

        return expanded;
    }

    getOntologyService(): OntologyService {
        return this.ontologyService;
    }
}
