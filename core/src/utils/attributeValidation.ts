import type { OntologyAttribute } from '../types/index.js';
import { ISODATE_REGEX, GEO_REGEX, RANGE_REGEX } from './constants.js';
import type { AttributeValidationResult } from './validationTypes.js';

export const NUMERIC_OPERATORS = new Set(['less than', 'greater than', 'less than or equal', 'greater than or equal', 'range', 'between']);

export function validateOperator(name: string, operator: string, definition: OntologyAttribute): AttributeValidationResult {
  const validOperators = [...(definition.operators.real ?? []), ...(definition.operators.imaginary ?? [])];
  if (validOperators.length > 0 && !validOperators.includes(operator)) {
    return { isValid: false, message: `Operator '${operator}' not supported for ${name}. Try: ${validOperators.join(', ')}` };
  }
  return { isValid: true, message: '' };
}

export function validateNumber(value: string, definition: OntologyAttribute, operator: string): AttributeValidationResult {
  if ((operator === 'between' || operator === 'is') && RANGE_REGEX.test(value)) {
    const [rMin, rMax] = value.split('-').map(v => parseFloat(v.trim()));
    const range = (definition as OntologyAttribute & { range?: [number, number] }).range;
    if (range && (rMin < range[0] || rMax > range[1])) {
      return { isValid: false, message: `Range must be within ${range[0]}-${range[1]}` };
    }
    return { isValid: true, message: '' };
  }

  if (value.trim() === '' || isNaN(Number(value))) {
    return { isValid: false, message: 'Value must be a number' };
  }

  const num = Number(value);
  const range = (definition as OntologyAttribute & { range?: [number, number] }).range;
  if (range && (num < range[0] || num > range[1])) {
    return { isValid: false, message: `Value must be between ${range[0]} and ${range[1]}` };
  }

  return { isValid: true, message: '' };
}

export function validateEnum(value: string, definition: OntologyAttribute): AttributeValidationResult {
  if (definition.options && !definition.options.includes(value)) {
    return { isValid: false, message: `Expected one of: ${definition.options.join(', ')}` };
  }
  return { isValid: true, message: '' };
}

export function validateDate(value: string): AttributeValidationResult {
  if (!ISODATE_REGEX.test(value) || isNaN(Date.parse(value))) {
    return { isValid: false, message: 'Invalid date format (YYYY-MM-DD)' };
  }
  return { isValid: true, message: '' };
}

export function validateGeo(value: string): AttributeValidationResult {
  if (!GEO_REGEX.test(value)) {
    return { isValid: false, message: 'Invalid coordinates (lat, long)' };
  }
  return { isValid: true, message: '' };
}

const VALIDATORS: Record<string, (value: string, definition: OntologyAttribute, operator: string) => AttributeValidationResult> = {
  number: validateNumber,
  enum: validateEnum,
  date: validateDate,
  datetime: validateDate,
  geo: validateGeo,
};

export function validateAttributeValue(
  name: string,
  operator: string,
  value: string,
  definition?: OntologyAttribute
): AttributeValidationResult {
  if (!definition) return { isValid: true, message: 'Custom property' };
  const opResult = validateOperator(name, operator, definition);
  if (!opResult.isValid) return opResult;
  const validator = VALIDATORS[definition.type];
  return validator ? validator(value, definition, operator) : { isValid: true, message: '' };
}