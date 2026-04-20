import { Property, Quantity, PropertyType } from './types/index.js';
import { OntologyService } from './ontologyService.js';
import { DEFAULT_ONTOLOGY } from './ontology.default.js';
import { PropertyValidationError } from './errorTypes.js';
import { parseQuantity } from './quantities.js';
import { Logger } from './utils/logging.js';

// Top-level Regex Constants
const PATTERNS = {
    SEND_TO: /(?:send|message)\s+(?:to|)\s+([+\w@#-]+)/i,
    CHANNEL: /(?:via|using|on|through)\s+(\w+)/i,
    PHONE: /(\+?\d{10,15})/,
    EMAIL: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    BUDGET: /(?:\$|USD\s*)(\d+(?:,\d{3})*(?:\.\d+)?)|(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:USD|dollars?)/i
};

const TYPE_CHECKERS = {
    NUMBER: /^-?\d+(\.\d+)?$/,
    DATE: /^\d{4}-\d{2}-\d{2}/,
    DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
    GEO: /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/
};

const INTENTS = [
    { key: 'reminder', regex: /remind.*me.*(to|about|that).*|set.*reminder/i },
    { key: 'schedule', regex: /schedule|book|plan|arrange.*for|appointment.*with/i },
    { key: 'communication', regex: /email|send.*message|text|call|contact.*about/i },
    { key: 'task', regex: /todo|to-do|task|do.*later|need.*to|want.*to/i },
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

const STOP_WORDS = new Set(['with', 'the', 'and', 'for', 'from', 'near', 'about', 'that', 'this']);

type ExtractionStrategy = (text: string, properties: Property[]) => void;

export class PropertyExtractor {
    private ontologyService: OntologyService;
    private logger: Logger;
    private strategies: ExtractionStrategy[];

    constructor(ontology = DEFAULT_ONTOLOGY) {
        this.ontologyService = new OntologyService(ontology);
        this.logger = Logger.getInstance();

        this.strategies = [
            this.applyIntentStrategy.bind(this),
            this.applySendToStrategy.bind(this),
            this.applyChannelStrategy.bind(this),
            this.applyPhoneStrategy.bind(this),
            this.applyEmailStrategy.bind(this),
            this.applyLocationStrategy.bind(this),
            this.applyDateStrategy.bind(this),
            this.applyBudgetStrategy.bind(this),
            this.applyFuzzyMatchingStrategy.bind(this)
        ];
    }

    extractFromText(text: string): Property[] {
        const properties: Property[] = [];
        this.strategies.forEach(strategy => strategy(text, properties));
        return properties;
    }

    private applyIntentStrategy(text: string, properties: Property[]): void {
        INTENTS.forEach(intent => {
            if (intent.regex.test(text) && !properties.some(p => p.key === 'intent' && p.values.includes(intent.key))) {
                properties.push({ key: 'intent', operator: 'is', values: [intent.key] });
            }
        });
    }

    private applySendToStrategy(text: string, properties: Property[]): void {
        const match = text.match(PATTERNS.SEND_TO);
        if (match) {
            properties.push({ key: 'to', operator: 'send to', values: [match[1]] });
        }
    }

    private applyChannelStrategy(text: string, properties: Property[]): void {
        const match = text.match(PATTERNS.CHANNEL);
        if (match) {
            const channel = match[1].toLowerCase(); // Normalize to lowercase
            const enumOptions = this.ontologyService.getEnumOptions('channel');
            if (enumOptions?.includes(channel)) {
                properties.push({ key: 'channel', operator: 'is', values: [channel] });
            }
        }
    }

    private applyPhoneStrategy(text: string, properties: Property[]): void {
        const match = text.match(PATTERNS.PHONE);
        if (match && !properties.some(p => p.key === 'to')) {
            properties.push({ key: 'from', operator: 'is', values: [match[1]] });
        }
    }

    private applyEmailStrategy(text: string, properties: Property[]): void {
        const match = text.match(PATTERNS.EMAIL);
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
        const match = text.match(PATTERNS.BUDGET);
        if (match) {
            const amount = match[1] || match[2];
            const normalizedAmount = amount.replace(/,/g, '');
            properties.push({ key: 'budget', operator: 'is', values: [normalizedAmount] });
        }
    }

    private applyFuzzyMatchingStrategy(text: string, properties: Property[]): void {
        const words = text.split(/\s+/);
        const existingKeys = new Set(properties.map(p => p.key));

        words.slice(0, -1).forEach((word, i) => {
            if (word.length <= 3) return;

            const [match] = this.ontologyService.getFuzzyMatches(word, 1);
            if (!match || existingKeys.has(match)) return;

            const nextWord = words[i + 1];
            if (nextWord.length > 2 && !STOP_WORDS.has(nextWord.toLowerCase())) {
                properties.push({ key: match, operator: 'contains', values: [nextWord] });
                existingKeys.add(match);
            }
        });
    }

    inferType(value: string): PropertyType {
        if (parseQuantity(value)) return 'quantity';
        if (TYPE_CHECKERS.NUMBER.test(value)) return 'number';
        if (TYPE_CHECKERS.DATE.test(value)) return 'date';
        if (TYPE_CHECKERS.DATETIME.test(value)) return 'datetime';
        if (TYPE_CHECKERS.GEO.test(value)) return 'geo';
        return 'string';
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
                if (!enumOptions.includes(v)) {
                    errors.push(`Value '${v}' not in enum options for '${key}'`);
                }
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
