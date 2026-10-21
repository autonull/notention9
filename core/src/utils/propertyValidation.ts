import type { Property, OntologyNode } from '../types/index.js';
import type { OntologyService } from '../ontology/ontologyService.js';
import { parseQuantity } from '../notes/quantities/index.js';
import { validateAttributeValue, NUMERIC_OPERATORS } from './attributeValidation.js';
import { getCanonicalKey } from '../ontology/ontologyHelpers.js';
import type { ValidationContext } from './validationContext.js';
import { createValidationContext } from './validationContext.js';
import type { ValidationResult } from './validationTypes.js';

function validateNumericValues(property: Property): string[] {
  if (property.operator === 'range') {
    const value = property.values[0];
    if (value?.includes('-')) {
      const [min, max] = value.split('-').map(parseFloat);
      if (isNaN(min) || isNaN(max)) {
        return [`Invalid range format: "${value}". Expected "min-max" numbers.`];
      }
    }
    return [];
  }

  return property.values
    .filter(value => isNaN(parseFloat(value)) && !parseQuantity(value))
    .map(value => `Operator "${property.operator}" requires numeric values. Got "${value}".`);
}

export function validatePropertyCore(
  property: Property,
  context: ValidationContext,
  checkAlias: boolean = false,
  ontologyForAlias?: OntologyNode[],
  requireAttribute: boolean = true
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!property.key?.trim()) errors.push('Property key is required.');
  if (!property.values?.length) errors.push('Property must have at least one value.');

  if (checkAlias && ontologyForAlias) {
    const canonical = getCanonicalKey(property.key, ontologyForAlias);
    if (canonical !== property.key) {
      warnings.push(`Property key '${property.key}' is an alias for '${canonical}'. Consider using the canonical key.`);
    }
  }

  const attr = context.getAttribute(property.key);
  if (!attr) {
    if (requireAttribute) {
      errors.push(`Attribute '${property.key}' not found in ontology`);
    }
  } else {
    const validOperators = context.getValidOperators(property.key);
    if (validOperators.length > 0 && !validOperators.includes(property.operator)) {
      errors.push(`Operator '${property.operator}' not valid for '${property.key}'`);
    }

    const enumOptions = context.getEnumOptions(property.key);
    if (enumOptions) {
      property.values
        .filter(v => !enumOptions.includes(v))
        .forEach(v => errors.push(`Value '${v}' not in enum options for '${property.key}'`));
    }
  }

  if (NUMERIC_OPERATORS.has(property.operator)) {
    errors.push(...validateNumericValues(property));
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateProperty(
  property: Property,
  ontology?: OntologyNode[] | OntologyService
): ValidationResult {
  const context = ontology ? createValidationContext(ontology) : {
    getAttribute: () => null,
    getValidOperators: () => [],
    getEnumOptions: () => null,
  };
  return validatePropertyCore(property, context, !!ontology, Array.isArray(ontology) ? ontology : undefined, !!ontology);
}