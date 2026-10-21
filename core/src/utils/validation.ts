import { Property, Note, OntologyNode, OntologyAttribute } from '../types/index.js';
import { parseQuantity } from '../notes/quantities/index.js';
import { getCanonicalKey, traverseTree } from '../ontology/ontologyHelpers.js';
import { OntologyService } from '../ontology/ontologyService.js';

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

interface ValidationContext {
	getAttribute(key: string): OntologyAttribute | null;
	getValidOperators(key: string): string[];
	getEnumOptions(key: string): string[] | null;
}

function createValidationContext(ontology: OntologyNode[] | OntologyService): ValidationContext {
	if (ontology instanceof OntologyService) {
		return {
			getAttribute: (key) => ontology.getAttribute(key),
			getValidOperators: (key) => ontology.getValidOperators(key),
			getEnumOptions: (key) => ontology.getEnumOptions(key),
		};
	}
	const attrIndex = new Map<string, OntologyAttribute>();
	const buildIndex = (nodes: OntologyNode[]) => {
		for (const node of nodes) {
			if (node.attributes) {
				for (const [key, attr] of Object.entries(node.attributes)) {
					attrIndex.set(key, attr);
					// Also add aliases as keys pointing to the same attribute
					if (attr.aliases) {
						for (const alias of attr.aliases) {
							attrIndex.set(alias, attr);
						}
					}
				}
			}
			if (node.children) buildIndex(node.children);
		}
	};
	buildIndex(ontology);
	return {
		getAttribute: (key) => attrIndex.get(key) ?? null,
		getValidOperators: (key) => {
			const attr = attrIndex.get(key);
			if (!attr) return [];
			return [...(attr.operators.real ?? []), ...(attr.operators.imaginary ?? [])];
		},
		getEnumOptions: (key) => {
			const attr = attrIndex.get(key);
			return attr?.options ?? null;
		},
	};
}

function validatePropertyCore(
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

export const validateProperty = (
	property: Property,
	ontology?: OntologyNode[] | OntologyService
): ValidationResult => {
	const context = ontology ? createValidationContext(ontology) : {
		getAttribute: () => null,
		getValidOperators: () => [],
		getEnumOptions: () => null,
	};
	return validatePropertyCore(property, context, !!ontology, Array.isArray(ontology) ? ontology : undefined, !!ontology);
};

export const validateNote = (note: Note, ontology: OntologyNode[]): ValidationResult => {
	const errors: string[] = [];
	const warnings: string[] = [];

	const context = createValidationContext(ontology);
	// Use requireAttribute: false for property validation since required attributes are checked at node level
	const propertyResults = note.properties.map(p => validatePropertyCore(p, context, true, ontology, false));
	errors.push(...propertyResults.flatMap((r, i) => r.isValid ? [] : r.errors.map(e => `Property '${note.properties[i].key}': ${e}`)));
	warnings.push(...propertyResults.flatMap(r => r.warnings ?? []));

	const noteCanonicalKeys = new Set(note.properties.map(p => getCanonicalKey(p.key, ontology)));

	traverseTree(ontology, node => {
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
		return false;
	});

	return { isValid: errors.length === 0, errors, warnings };
};