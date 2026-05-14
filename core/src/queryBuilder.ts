import { Property } from './types/index.js';
import { OntologyService, type WidgetMetadata } from './ontologyService.js';
import { DEFAULT_ONTOLOGY } from './ontology.default.js';

export interface FilterSuggestion {
	key: string;
	label: string;
	description: string;
	widget: WidgetMetadata;
}

export interface QueryValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export class QueryBuilder {
	private ontologyService: OntologyService;

	constructor(ontology = DEFAULT_ONTOLOGY) {
		this.ontologyService = new OntologyService(ontology);
	}

	getAvailableFilters(existingProps: Property[]): FilterSuggestion[] {
		const usedKeys = new Set(existingProps.map(p => p.key));
		const allKeys = this.ontologyService.getAllAttributeKeys();
		const suggestions: FilterSuggestion[] = [];

		for (const key of allKeys) {
			if (!usedKeys.has(key)) {
				const attr = this.ontologyService.getAttribute(key);
				const metadata = this.ontologyService.getWidgetMetadata(key);
				if (attr && metadata) {
					suggestions.push({ key, label: this.formatLabel(key), description: attr.description ?? '', widget: metadata });
				}
			}
		}
		return suggestions.sort((a, b) => a.label.localeCompare(b.label));
	}

	getOperatorsForAttribute(key: string): string[] {
		return this.ontologyService.getValidOperators(key);
	}

	validateQuery(properties: Property[]): QueryValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];
		const operatorCount = new Map<string, number>();

		for (const prop of properties) {
			if (!this.ontologyService.hasAttribute(prop.key)) {
				errors.push(`Unknown attribute: ${prop.key}`);
				continue;
			}

			const validOps = this.ontologyService.getValidOperators(prop.key);
			if (!validOps.includes(prop.operator)) {
				errors.push(`Invalid operator '${prop.operator}' for '${prop.key}'. Valid: ${validOps.join(', ')}`);
			}

			const realOps = this.ontologyService.getValidOperators(prop.key, 'real');
			if (realOps.includes(prop.operator)) {
				const count = operatorCount.get(prop.key) ?? 0;
				if (count > 0) warnings.push(`Multiple real operators for '${prop.key}' may conflict`);
				operatorCount.set(prop.key, count + 1);
			}

			const enumOptions = this.ontologyService.getEnumOptions(prop.key);
			if (enumOptions) {
				for (const value of prop.values) {
					if (!enumOptions.includes(value)) {
						errors.push(`Invalid value '${value}' for '${prop.key}'. Valid: ${enumOptions.join(', ')}`);
					}
				}
			}

			if (prop.values.length === 0) {
				errors.push(`Property '${prop.key}' has no values`);
			}
		}

		return { valid: errors.length === 0, errors, warnings };
	}

	fromTemplate(templateName: string): Property[] {
		const templates: Record<string, Property[]> = {
			'job-search': [{ key: 'role', operator: 'contains', values: [] }, { key: 'location', operator: 'is near', values: [] }],
			'housing-search': [{ key: 'location', operator: 'is near', values: [] }, { key: 'price', operator: 'less than', values: [] }],
			'send-message': [{ key: 'to', operator: 'send to', values: [] }, { key: 'channel', operator: 'is', values: ['whatsapp'] }],
			'event-reminder': [{ key: 'event', operator: 'is', values: [] }, { key: 'startDateTime', operator: 'is', values: [] }]
		};
		return templates[templateName] ?? [];
	}

	suggestNextProperty(existingProps: Property[]): FilterSuggestion[] {
		const suggestions: FilterSuggestion[] = [];

		if (existingProps.some(p => p.key === 'location')) {
			const roleFilter = this.createSuggestion('role');
			if (roleFilter) suggestions.push(roleFilter);
		}

		if (existingProps.some(p => p.key === 'to') && !existingProps.some(p => p.key === 'channel')) {
			const channelFilter = this.createSuggestion('channel');
			if (channelFilter) suggestions.push(channelFilter);
		}

		if (existingProps.some(p => p.key === 'startDateTime') && !existingProps.some(p => p.key === 'event')) {
			const eventFilter = this.createSuggestion('event');
			if (eventFilter) suggestions.push(eventFilter);
		}

		return suggestions.length > 0 ? suggestions : this.getAvailableFilters(existingProps).slice(0, 5);
	}

	private createSuggestion(key: string): FilterSuggestion | null {
		const attr = this.ontologyService.getAttribute(key);
		const metadata = this.ontologyService.getWidgetMetadata(key);
		if (!attr || !metadata) return null;
		return { key, label: this.formatLabel(key), description: attr.description ?? '', widget: metadata };
	}

	private formatLabel(key: string): string {
		return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
	}

	getOntologyService(): OntologyService {
		return this.ontologyService;
	}
}
