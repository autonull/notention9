import { Property, Quantity, PropertyType } from '../../types/index.js';
import { OntologyService } from '../../ontology/ontologyService.js';
import { DEFAULT_ONTOLOGY } from '../../ontology/ontology.default.js';
import { PropertyValidationError } from '../../utils/errors/index.js';
import { parseQuantity } from '../quantities/index.js';
import { Logger } from '../../utils/logging.js';
import { getCanonicalKey } from '../../ontology/ontologyHelpers.js';
import {
  extractIntents,
  extractRegexProps,
  extractLocation,
  extractDate,
  extractFuzzy
} from './extractors.js';
import { TYPE_CHECKERS } from './patterns.js';

export class PropertyExtractor {
  private readonly ontologyService: OntologyService;
  private readonly logger = Logger.getInstance();

  constructor(ontology = DEFAULT_ONTOLOGY) {
    this.ontologyService = new OntologyService(ontology);
  }

  extractFromText(text: string): Property[] {
    const properties: Property[] = [
      ...extractIntents(text),
      ...extractRegexProps(text, this.ontologyService),
      ...extractLocation(text),
      ...extractDate(text),
      ...extractFuzzy(text, this.ontologyService)
    ];

    return this.normalizeProperties(properties);
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