import { Property, Note, OntologyNode, OntologyAttribute } from './types/index.js';
import { parseQuantity } from './quantities.js';
import { getCanonicalKey } from './ontologyHelpers.js';

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
	warnings?: string[];
}

export interface AttributeValidationResult {
	isValid: boolean;
	message: string;
}

const NUMERIC_OPERATORS = new Set(['less than', 'greater than', 'less than or equal', 'greater than or equal', 'range', 'between']);
const ISODATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
const GEO_REGEX = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
const RANGE_REGEX = /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/;

const validateOperator = (name: string, operator: string, definition: OntologyAttribute): AttributeValidationResult => {
	const validOperators = [...(definition.operators.real ?? []), ...(definition.operators.imaginary ?? [])];
	if (validOperators.length > 0 && !validOperators.includes(operator)) {
		return { isValid: false, message: `Operator '${operator}' not supported for ${name}. Try: ${validOperators.join(', ')}` };
	}
	return { isValid: true, message: '' };
};

const validateNumber = (value: string, definition: OntologyAttribute, operator: string): AttributeValidationResult => {
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
};

const validateEnum = (value: string, definition: OntologyAttribute): AttributeValidationResult => {
	if (definition.options && !definition.options.includes(value)) {
		return { isValid: false, message: `Expected one of: ${definition.options.join(', ')}` };
	}
	return { isValid: true, message: '' };
};

const validateDate = (value: string): AttributeValidationResult => {
	if (!ISODATE_REGEX.test(value) || isNaN(Date.parse(value))) {
		return { isValid: false, message: 'Invalid date format (YYYY-MM-DD)' };
	}
	return { isValid: true, message: '' };
};

const validateGeo = (value: string): AttributeValidationResult => {
	if (!GEO_REGEX.test(value)) {
		return { isValid: false, message: 'Invalid coordinates (lat, long)' };
	}
	return { isValid: true, message: '' };
};

const VALIDATORS: Record<string, (value: string, definition: OntologyAttribute, operator: string) => AttributeValidationResult> = {
	number: validateNumber,
	enum: validateEnum,
	date: validateDate,
	datetime: validateDate,
	geo: validateGeo,
};

export const validateAttributeValue = (
	name: string,
	operator: string,
	value: string,
	definition?: OntologyAttribute
): AttributeValidationResult => {
	if (!definition) return { isValid: true, message: 'Custom property' };
	const opResult = validateOperator(name, operator, definition);
	if (!opResult.isValid) return opResult;
	const validator = VALIDATORS[definition.type];
	return validator ? validator(value, definition, operator) : { isValid: true, message: '' };
};

const validateNumericValues = (property: Property): string[] => {
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
};

export const validateProperty = (property: Property, ontology?: OntologyNode[]): ValidationResult => {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!property.key?.trim()) errors.push('Property key is required.');
	if (!property.values?.length) errors.push('Property must have at least one value.');

	if (ontology) {
		const canonical = getCanonicalKey(property.key, ontology);
		if (canonical !== property.key) {
			warnings.push(`Property key '${property.key}' is an alias for '${canonical}'. Consider using the canonical key.`);
		}
	}

	if (NUMERIC_OPERATORS.has(property.operator)) {
		errors.push(...validateNumericValues(property));
	}

	return { isValid: errors.length === 0, errors, warnings };
};

export const validateNote = (note: Note, ontology: OntologyNode[]): ValidationResult => {
	const errors: string[] = [];
	const warnings: string[] = [];

	const propertyResults = note.properties.map(p => validateProperty(p, ontology));
	errors.push(...propertyResults.flatMap((r, i) => r.isValid ? [] : r.errors.map(e => `Property '${note.properties[i].key}': ${e}`)));
	warnings.push(...propertyResults.flatMap(r => r.warnings ?? []));

	const noteCanonicalKeys = new Set(note.properties.map(p => getCanonicalKey(p.key, ontology)));

	const stack = [...ontology];
	while (stack.length > 0) {
		const node = stack.pop()!;
		if (node.requiredAttributes?.length) {
			const nodeKeys = Object.keys(node.attributes ?? {});
			if (nodeKeys.some(key => noteCanonicalKeys.has(key))) {
				for (const reqKey of node.requiredAttributes) {
					if (!noteCanonicalKeys.has(reqKey)) {
						errors.push(`Missing required property: '${reqKey}' (for ${node.label}).`);
					}
				}
			}
		}
		stack.push(...(node.children ?? []));
	}

	return { isValid: errors.length === 0, errors, warnings };
};
