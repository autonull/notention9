/**
 * Unified Extraction Pipeline
 * 
 * Consolidates extraction from:
 * - core/src/extraction/deterministic.ts (deterministic regex/patterns)
 * - ui/src/services/ai/LocalProvider.ts (heuristic extraction)
 * - ui/src/services/ai/inference.ts (AI-based with validation)
 * 
 * Provides composable stages: Deterministic → Pattern → AI → Fuzzy
 */

import type { OntologyNode, Property, PropertyType, Quantity } from '../types/index.js';
import { OntologyService } from '../ontology/ontologyService.js';
import { parseQuantity } from '../notes/quantities/index.js';
import { collectOntologyKeys, getCanonicalKey } from '../ontology/index.js';
import { REGEX } from '../notes/parsing/constants.js';
import {
    PATTERNS as CORE_PATTERNS,
    INTENTS,
    LOCATION_PATTERNS,
    DATE_PATTERNS,
    STOP_WORDS
} from '../notes/propertyExtractor/patterns.js';
import {
    addProperty,
    hasProperty,
    makePropertyId,
    getProperties,
    PROP_ID_SEPARATOR
} from './propertyUtils.js';
import {
    extractIntents,
    extractCommunication,
    extractLocations,
    extractDates,
    extractPrices,
    extractRoles,
    runDeterministicExtraction,
} from './extractionPatterns.js';
import {
    EXTRACTION_STAGE_PRIORITIES,
    EXTRACTION_STAGE_CONFIDENCE,
    getStagePriority,
    getStageConfidence,
} from './extractionConstants.js';

export type ExtractionStageName = 'deterministic' | 'pattern' | 'ai' | 'fuzzy';

export interface ExtractionStage {
    readonly name: ExtractionStageName;
    readonly priority: number; // Lower = runs first
    extract(text: string, ontology: OntologyNode[], context?: ExtractionContext): Property[] | Promise<Property[]>;
}

export interface ExtractionContext {
    existingProperties?: Property[];
    ontologyService?: OntologyService;
    options?: ExtractionOptions;
}

export interface ExtractionOptions {
    /** Enable intent extraction */
    intents?: boolean;
    /** Enable regex pattern extraction */
    patterns?: boolean;
    /** Enable ontology-based key extraction */
    ontologyKeys?: boolean;
    /** Enable fuzzy matching */
    fuzzy?: boolean;
    /** Enable price/cost extraction */
    price?: boolean;
    /** Enable date/deadline extraction */
    dates?: boolean;
    /** Enable role extraction */
    roles?: boolean;
    /** Enable range extraction */
    ranges?: boolean;
    /** Maximum properties to extract */
    maxProperties?: number;
    /** Minimum confidence for fuzzy matches */
    fuzzyThreshold?: number;
}

export interface ExtractionResult {
    properties: Property[];
    byStage: Record<ExtractionStageName, Property[]>;
    explanations: ExtractionExplanation[];
}

export interface ExtractionExplanation {
    property: Property;
    stage: ExtractionStageName;
    matchedBy: string;
    confidence: number;
}

export interface AlignmentExplanation {
    property: Property;
    matchedBy: 'regex' | 'ontology-key' | 'intent' | 'fuzzy' | 'price' | 'date' | 'role' | 'range';
}

/**
 * Deterministic extraction stage - regex/pattern based
 */
export class DeterministicStage implements ExtractionStage {
    readonly name = 'deterministic' as const;
    readonly priority = getStagePriority('deterministic');

    extract(text: string, ontology: OntologyNode[], context?: ExtractionContext): Property[] {
        const options = context?.options ?? {};
        
        return runDeterministicExtraction(text, ontology, {
            intents: options.intents,
            patterns: options.patterns,
            dates: options.dates,
            price: options.price,
            roles: options.roles,
            ranges: options.ranges,
        });
    }
}

/**
 * Pattern extraction stage - price, dates, roles, ranges (enhanced heuristics)
 */
export class PatternStage implements ExtractionStage {
    readonly name = 'pattern' as const;
    readonly priority = getStagePriority('pattern');

    extract(text: string, ontology: OntologyNode[], context?: ExtractionContext): Property[] {
        const options = context?.options ?? {};
        const properties = new Map<string, Property>();
        const lowerText = text.toLowerCase();

        // Use shared extraction functions
        extractPrices(text, properties, { price: options.price, ranges: options.ranges });
        extractRoles(text, properties, { roles: options.roles });
        extractDates(text, lowerText, properties, { dates: options.dates });

        return getProperties(properties);
    }
}

/**
 * Ontology-based extraction stage - key matching from ontology
 */
export class OntologyKeyStage implements ExtractionStage {
    readonly name = 'pattern' as const; // Same priority as PatternStage
    readonly priority = getStagePriority('pattern');

    extract(text: string, ontology: OntologyNode[], context?: ExtractionContext): Property[] {
        const options = context?.options ?? {};
        const properties = new Map<string, Property>();

        if (options.ontologyKeys !== false) {
            const allKeys = collectOntologyKeys(ontology);

            [...allKeys].sort((a, b) => b.length - a.length).forEach(key => {
                const regex = new RegExp(`${key}\\s*(is|:|contains|under|below|over|above|less than|more than|greater than)\\s*([\\w\\s@.:/\\-]+)`, 'i');
                const match = text.match(regex);
                if (!match) return;

                const operatorStr = match[1].toLowerCase();
                const value = match[2].trim().replace(/[.,!?;:]$/, '');
                if (!value || value.length >= 50) return;

                let operator = 'is';
                if (operatorStr.includes('contains')) operator = 'contains';
                else if (['under', 'below', 'less than'].some(part => operatorStr.includes(part))) operator = 'less than';
                else if (['over', 'above', 'more than', 'greater than'].some(part => operatorStr.includes(part))) operator = 'greater than';

                const quantity = parseQuantity(value);
                const canonicalKey = getCanonicalKey(key, ontology);
                addProperty(properties, canonicalKey, operator, quantity?.unit ? `${quantity.value} ${quantity.unit}` : value);
            });
        }

        return getProperties(properties);
    }
}

/**
 * AI-based extraction stage - uses LLM with validation pipeline
 */
export interface AIExtractionProvider {
    extract(text: string, ontology: OntologyNode[]): Promise<Property[]>;
}

export class AIStage implements ExtractionStage {
    readonly name = 'ai' as const;
    readonly priority = getStagePriority('ai');

    constructor(private readonly provider: AIExtractionProvider) {}

    async extract(text: string, ontology: OntologyNode[], context?: ExtractionContext): Promise<Property[]> {
        try {
            return await this.provider.extract(text, ontology);
        } catch {
            return [];
        }
    }
}

/**
 * Fuzzy matching stage - conservative fuzzy matching
 */
export class FuzzyStage implements ExtractionStage {
    readonly name = 'fuzzy' as const;
    readonly priority = getStagePriority('fuzzy');

    extract(text: string, ontology: OntologyNode[], context?: ExtractionContext): Property[] {
        const options = context?.options ?? {};
        const ontologyService = context?.ontologyService ?? new OntologyService(ontology);
        const properties = new Map<string, Property>();
        const existingKeys = new Set(context?.existingProperties?.map(p => p.key) ?? []);

        if (options.fuzzy !== false) {
            const words = text.split(/\s+/);
            const threshold = options.fuzzyThreshold ?? 0.8;

            for (let i = 0; i < words.length - 1; i++) {
                const word = words[i];
                if (word.length <= 3) continue;
                const [match] = ontologyService.getFuzzyMatches(word, 1);
                if (!match || existingKeys.has(match)) continue;

                const nextWord = words[i + 1];
                if (nextWord.length > 2 && !STOP_WORDS.has(nextWord.toLowerCase())) {
                    existingKeys.add(match);
                    addProperty(properties, match, 'contains', nextWord);
                }
            }
        }

        return getProperties(properties);
    }
}

/**
 * Default stage instances
 */
export const defaultStages: ExtractionStage[] = [
    new DeterministicStage(),
    new PatternStage(),
    new OntologyKeyStage(),
    new FuzzyStage(),
];

/**
 * Extraction Pipeline - orchestrates stages
 */
export class ExtractionPipeline {
    private stages: ExtractionStage[];

    constructor(stages: ExtractionStage[] = defaultStages) {
        this.stages = [...stages].sort((a, b) => a.priority - b.priority);
    }

    /**
     * Add or replace a stage
     */
    addStage(stage: ExtractionStage): void {
        const existingIndex = this.stages.findIndex(s => s.name === stage.name);
        if (existingIndex >= 0) {
            this.stages[existingIndex] = stage;
        } else {
            this.stages.push(stage);
        }
        this.stages.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Remove a stage by name
     */
    removeStage(name: ExtractionStageName): void {
        this.stages = this.stages.filter(s => s.name !== name);
    }

    /**
     * Get stage by name
     */
    getStage(name: ExtractionStageName): ExtractionStage | undefined {
        return this.stages.find(s => s.name === name);
    }

    /**
     * Run full extraction pipeline
     */
    async extract(text: string, ontology: OntologyNode[], options?: ExtractionOptions): Promise<ExtractionResult> {
        const allProperties = new Map<string, Property>();
        const byStage: Record<ExtractionStageName, Property[]> = {
            deterministic: [],
            pattern: [],
            ai: [],
            fuzzy: [],
        };
        const explanations: ExtractionExplanation[] = [];
        const existingKeys = new Set<string>();

        const context: ExtractionContext = { options };

        for (const stage of this.stages) {
            // Update context with existing properties for deduplication
            context.existingProperties = Array.from(allProperties.values());
            context.ontologyService = new OntologyService(ontology);

            const stageProperties = await stage.extract(text, ontology, context);

            for (const prop of stageProperties) {
                const id = `${prop.key}\u0000${prop.operator}`;
                if (!allProperties.has(id)) {
                    allProperties.set(id, prop);
                    byStage[stage.name].push(prop);
                    explanations.push({
                        property: prop,
                        stage: stage.name,
                        matchedBy: stage.name,
                        confidence: this.getStageConfidence(stage.name, prop),
                    });
                    existingKeys.add(prop.key);
                }
            }

            // Respect maxProperties limit
            if (options?.maxProperties && allProperties.size >= options.maxProperties) {
                break;
            }
        }

        return {
            properties: Array.from(allProperties.values()),
            byStage,
            explanations,
        };
    }

    private getStageConfidence(stageName: ExtractionStageName, _property: Property): number {
        return getStageConfidence(stageName);
    }
}

/**
 * Create a pipeline with default stages plus AI stage
 */
export function createExtractionPipeline(aiProvider?: AIExtractionProvider): ExtractionPipeline {
    const stages = [...defaultStages];
    if (aiProvider) {
        stages.push(new AIStage(aiProvider));
    }
    return new ExtractionPipeline(stages);
}

/**
 * Backward compatibility - alignToOntology function
 */
export function alignToOntology(
    text: string,
    ontology: OntologyNode[],
    options?: { ontologyService?: OntologyService }
): Property[] {
    const pipeline = new ExtractionPipeline(defaultStages);
    // Synchronous wrapper for backward compat - runs determinstic only
    const deterministicStage = new DeterministicStage();
    return deterministicStage.extract(text, ontology, { options: options as any });
}

/**
 * Backward compatibility - explainAlignment function
 */
export function explainAlignment(text: string, properties: Property[]): { property: Property; matchedBy: string }[] {
    return properties.map(prop => ({
        property: prop,
        matchedBy: 'pipeline',
    }));
}