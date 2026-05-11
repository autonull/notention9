import { Property, Quantity, PropertyType } from './types/index.js';
import { OntologyService } from './ontologyService.js';
import { DEFAULT_ONTOLOGY } from './ontology.default.js';
import { PropertyValidationError } from './errorTypes.js';
import { parseQuantity } from './quantities.js';
import { Logger } from './utils/logging.js';
import { getCanonicalKey } from './ontologyHelpers.js';
import { REGEX } from './parsing.js';

const PATTERNS = {
  SEND_TO: /(?:send|message)\s+(?:to|)\s+([+\w@#-]+)/i,
  CHANNEL: /(?:via|using|on|through)\s+(\w+)/i,
} as const;

const TYPE_CHECKERS = {
  NUMBER: /^-?\d+(\.\d+)?$/,
  DATE: /^\d{4}-\d{2}-\d{2}/,
  DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  GEO: /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/,
} as const;

const INTENTS = [
  { key: 'reminder', regex: /remind.*me.*(to|about|that).*|set.*reminder/i },
  { key: 'schedule', regex: /schedule|book|plan|arrange.*for|appointment.*with/i },
  { key: 'communication', regex: /email|send.*message|text|call|contact.*about/i },
  { key: 'task', regex: /todo|to-do|task|do.*later|need.*to|want.*to/i },
  { key: 'shopping', regex: /buy|purchase|order|get.*from|shop.*for/i },
  { key: 'health', regex: /medication|take.*pill|doctor.*appointment|exercise|workout/i },
] as const;

const LOCATION_KEYWORDS = ['near', 'in', 'at'];
const LOCATION_PATTERNS = LOCATION_KEYWORDS.map(k => ({
  regex: new RegExp(`${k}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'gi'),
  prefix: new RegExp(`^${k}\\s+`, 'i'),
}));

const DATE_PATTERNS = [
  { regex: /tomorrow/i, offset: 1 },
  { regex: /today/i, offset: 0 },
  { regex: /yesterday/i, offset: -1 },
] as const;

const STOP_WORDS = new Set(['with', 'the', 'and', 'for', 'from', 'near', 'about', 'that', 'this']);

type ExtractionStrategy = (text: string, properties: Property[]) => void;

export class PropertyExtractor {
  private readonly ontologyService: OntologyService;
  private readonly logger = Logger.getInstance();

  constructor(ontology = DEFAULT_ONTOLOGY) {
    this.ontologyService = new OntologyService(ontology);
  }

  extractFromText(text: string): Property[] {
    const properties: Property[] = [
      ...this.extractIntents(text),
      ...this.extractRegexProps(text),
      ...this.extractLocation(text),
      ...this.extractDate(text),
      ...this.extractFuzzy(text)
    ];

    return this.normalizeProperties(properties);
  }

  private extractIntents(text: string): Property[] {
    return INTENTS
      .filter(intent => intent.regex.test(text))
      .map(intent => ({ key: 'intent', operator: 'is', values: [intent.key] }));
  }

  private extractRegexProps(text: string): Property[] {
    const props: Property[] = [];

    const sendToMatch = text.match(PATTERNS.SEND_TO);
    if (sendToMatch) props.push({ key: 'to', operator: 'send to', values: [sendToMatch[1]] });

    const channelMatch = text.match(PATTERNS.CHANNEL);
    if (channelMatch) {
      const channel = channelMatch[1].toLowerCase();
      if (this.ontologyService.getEnumOptions('channel')?.includes(channel)) {
        props.push({ key: 'channel', operator: 'is', values: [channel] });
      }
    }

    const phoneMatch = text.match(REGEX.PHONE);
    if (phoneMatch && !props.some(p => p.key === 'to')) {
      props.push({ key: 'from', operator: 'is', values: [phoneMatch[1]] });
    }

    const emailMatch = text.match(REGEX.EMAIL);
    if (emailMatch) props.push({ key: 'email', operator: 'is', values: [emailMatch[1]] });

    const budgetMatch = text.match(REGEX.BUDGET);
    if (budgetMatch) {
      const amount = (budgetMatch[1] || budgetMatch[2]).replace(/,/g, '');
      props.push({ key: 'budget', operator: 'is', values: [amount] });
    }

    return props;
  }

  private extractLocation(text: string): Property[] {
    const match = LOCATION_PATTERNS.find(p => p.regex.test(text));
    if (!match) return [];
    const location = text.match(match.regex)![0].replace(match.prefix, '').trim();
    return [{ key: 'location', operator: 'is near', values: [location] }];
  }

  private extractDate(text: string): Property[] {
    const pattern = DATE_PATTERNS.find(p => p.regex.test(text));
    if (!pattern) return [];

    const date = new Date();
    date.setDate(date.getDate() + pattern.offset);
    return [{ key: 'date', operator: 'is', values: [date.toISOString().split('T')[0]] }];
  }

  private extractFuzzy(text: string): Property[] {
    const words = text.split(/\s+/);
    const existingKeys = new Set<string>();

    return words.slice(0, -1).flatMap((word, i) => {
      if (word.length <= 3) return [];
      const [match] = this.ontologyService.getFuzzyMatches(word, 1);
      if (!match || existingKeys.has(match)) return [];

      const nextWord = words[i + 1];
      if (nextWord.length > 2 && !STOP_WORDS.has(nextWord.toLowerCase())) {
        existingKeys.add(match);
        return [{ key: match, operator: 'contains', values: [nextWord] }];
      }
      return [];
    });
  }

  private normalizeProperties(properties: Property[]): Property[] {
    const ontologyNodes = this.ontologyService.getAllNodes();
    return properties.map(prop => {
      const canonicalKey = getCanonicalKey(prop.key, ontologyNodes);
      return canonicalKey !== prop.key ? { ...prop, key: canonicalKey } : prop;
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
    const { key, operator, values } = property;
    const attr = this.ontologyService.getAttribute(key);
    if (!attr) {
      return { valid: false, errors: [`Attribute '${key}' not found in ontology`] };
    }

    const errors: string[] = [];
    if (!this.ontologyService.getValidOperators(key).includes(operator)) {
      errors.push(`Operator '${operator}' not valid for '${key}'`);
    }

    const enumOptions = this.ontologyService.getEnumOptions(key);
    if (enumOptions) {
      values.filter(v => !enumOptions.includes(v)).forEach(v => {
        errors.push(`Value '${v}' not in enum options for '${key}'`);
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

    if (isPrice && quantity.unitType === 'compound' && !isRate) {
      this.logger.warn(`Property ${propertyKey} appears to be a simple price but has a compound unit: ${quantity.unit}`);
    }
    if (isRate && quantity.unitType === 'simple') {
      this.logger.warn(`Property ${propertyKey} appears to be a rate but has a simple unit: ${quantity.unit}`);
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
