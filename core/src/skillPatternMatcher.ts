import { Property, Note } from './types/index.js';
import { OntologyService } from './ontologyService.js';
import { DEFAULT_ONTOLOGY } from './ontology.default.js';

/**
 * Skill Definition - Adapters that map external data to ontology
 * 
 * Skills don't define domains - they map external APIs to semantic properties.
 */

export interface SemanticPattern {
    requiresAny?: Array<{
        attributeType?: string;
        keySimilarTo?: string[];
        operator?: string;
    }>;
    requiresAll?: Array<{
        attributeType?: string;
        keySimilarTo?: string[];
        operator?: string;
    }>;
}

export interface SkillDefinition {
    id: string;
    name: string;
    description: string;

    // Semantic pattern for matching (ontology-based)
    semanticPattern: SemanticPattern;

    // Export: Ontology → External API
    exportMapping: Record<string, string>;

    // Import: External data → Ontology
    importMapping: Record<string, string>;

    // Executor function (skill implementation)
    execute?: (properties: Property[]) => Promise<any>;
}

export interface SkillMatch {
    skill: SkillDefinition;
    confidence: number;
    matchedAttributes: string[];
}

/**
 * SkillPatternMatcher - Match notes against skill semantic patterns
 * 
 * Uses ontology for fuzzy key matching (role = job = position).
 * NO HARDCODING - all matching based on ontology metadata.
 */
export class SkillPatternMatcher {
    private ontologyService: OntologyService;
    private skills: Map<string, SkillDefinition> = new Map();

    constructor(ontology = DEFAULT_ONTOLOGY) {
        this.ontologyService = new OntologyService(ontology);
    }

    /**
     * Register a skill adapter
     */
    registerSkill(skill: SkillDefinition): void {
        this.skills.set(skill.id, skill);
    }

    /**
     * Unregister a skill
     */
    unregisterSkill(skillId: string): void {
        this.skills.delete(skillId);
    }

    /**
     * Get all registered skills
     */
    getSkills(): SkillDefinition[] {
        return Array.from(this.skills.values());
    }

    /**
     * Match note properties against all skills
     * Returns skills sorted by confidence score
     */
    matchSkills(note: Note): SkillMatch[] {
        return Array.from(this.skills.values())
            .map(skill => this.matchSkill(note, skill))
            .filter(match => match.confidence > 0)
            .sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Match note against a specific skill
     */
    private matchSkill(note: Note, skill: SkillDefinition): SkillMatch {
        const pattern = skill.semanticPattern;
        const matchedAttributes: string[] = [];
        let score = 0;

        // Check requiresAll (all must match)
        if (pattern.requiresAll) {
            const allMatched = pattern.requiresAll.every(requirement => {
                const matches = this.matchRequirement(note.properties, requirement);
                if (matches.length === 0) return false;

                matchedAttributes.push(...matches);
                score += 30; // Base score for required match
                return true;
            });

            if (!allMatched) {
                return { skill, confidence: 0, matchedAttributes: [] };
            }
        }

        // Check requiresAny (at least one must match)
        if (pattern.requiresAny && pattern.requiresAny.length > 0) {
            let anyMatched = false;
            pattern.requiresAny.forEach(requirement => {
                const matches = this.matchRequirement(note.properties, requirement);
                if (matches.length > 0) {
                    anyMatched = true;
                    matchedAttributes.push(...matches);
                    score += 20; // Bonus for optional match
                }
            });

            if (!anyMatched) {
                // None of the optional requirements matched
                return { skill, confidence: 0, matchedAttributes: [] };
            }
        }

        // Normalize confidence to 0-100
        const confidence = Math.min(100, score);

        return {
            skill,
            confidence,
            matchedAttributes: Array.from(new Set(matchedAttributes)) // Dedupe
        };
    }

    /**
     * Match properties against a single requirement
     * Returns matched attribute keys
     */
    private matchRequirement(
        properties: Property[],
        requirement: {
            attributeType?: string;
            keySimilarTo?: string[];
            operator?: string;
        }
    ): string[] {
        return properties
            .filter(prop => {
                // Check attribute type
                if (requirement.attributeType) {
                    const attr = this.ontologyService.getAttribute(prop.key);
                    if (!attr || attr.type !== requirement.attributeType) {
                        return false;
                    }
                }

                // Check key similarity (fuzzy match)
                if (requirement.keySimilarTo && !this.isSimilarKey(prop.key, requirement.keySimilarTo)) {
                    return false;
                }

                // Check operator
                if (requirement.operator && prop.operator !== requirement.operator) {
                    return false;
                }

                return true;
            })
            .map(prop => prop.key);
    }

    /**
     * Fuzzy key matching using ontology
     * Checks if key is similar to any of the target keys
     */
    private isSimilarKey(key: string, targets: string[]): boolean {
        const lowerKey = key.toLowerCase();

        return targets.some(target => {
            const lowerTarget = target.toLowerCase();

            // Exact match or Contains
            if (lowerKey === lowerTarget || lowerKey.includes(lowerTarget) || lowerTarget.includes(lowerKey)) {
                return true;
            }

            // Fuzzy match via ontology
            return this.ontologyService.getFuzzyMatches(target, 5).includes(key);
        });
    }

    /**
     * Get best matching skill for note (highest confidence)
     */
    getBestMatch(note: Note): SkillMatch | null {
        const matches = this.matchSkills(note);
        return matches.length > 0 ? matches[0] : null;
    }

    /**
     * Check if note matches any skill above threshold
     */
    hasMatch(note: Note, confidenceThreshold: number = 50): boolean {
        const best = this.getBestMatch(note);
        return best !== null && best.confidence >= confidenceThreshold;
    }

    /**
     * Map note properties to external API parameters using skill's exportMapping
     */
    mapToExternal(note: Note, skill: SkillDefinition): Record<string, any> {
        return note.properties.reduce((params, prop) => {
            const externalKey = skill.exportMapping[prop.key];
            if (externalKey) {
                // Map to external parameter name
                params[externalKey] = prop.values[0]; // Use first value
            }
            return params;
        }, {} as Record<string, any>);
    }

    /**
     * Map external data to ontology properties using skill's importMapping
     */
    mapFromExternal(externalData: Record<string, any>, skill: SkillDefinition): Property[] {
        return Object.entries(skill.importMapping)
            .map(([externalKey, ontologyKey]) => {
                const value = this.extractValue(externalData, externalKey);
                if (value === null || value === undefined) return null;

                // Get default operator from ontology
                const validOps = this.ontologyService.getValidOperators(ontologyKey);
                const operator = validOps[0] || 'is'; // Use first valid operator

                return {
                    key: ontologyKey,
                    operator,
                    values: Array.isArray(value) ? value : [String(value)]
                };
            })
            .filter((prop): prop is Property => prop !== null);
    }

    /**
     * Extract value from external data (supports CSS selectors and dot notation)
     */
    private extractValue(data: any, path: string): any {
        // Simple dot notation support
        if (path.startsWith('.')) {
            // CSS selector - assume data is already extracted
            return data[path];
        }

        // Dot notation path (e.g., 'job.title')
        return path.split('.').reduce((current, part) => {
            if (current && typeof current === 'object' && part in current) {
                return current[part];
            }
            return null;
        }, data);
    }

    /**
     * Get ontology service
     */
    getOntologyService(): OntologyService {
        return this.ontologyService;
    }
}
