/**
 * Correction Flow — Learn from user corrections to improve extraction
 * Tracks property additions/removals/edits and feeds back to extraction pipeline
 */

import type { Property, OntologyNode } from '../types/index.js';
import { OntologyService } from '../ontology/ontologyService.js';
import {
    CORRECTION_MIN_OCCURRENCES,
    CORRECTION_MIN_CONFIDENCE,
    CORRECTION_MAX_PATTERNS,
    CORRECTION_DECAY_FACTOR,
    CORRECTION_BASE_CONFIDENCE,
    CORRECTION_CONFIDENCE_INCREMENT,
    CORRECTION_MAX_CONFIDENCE,
    CORRECTION_MAX_EXAMPLES,
} from '../telemetry/constants.js';

export interface Correction {
    /** Unique correction ID */
    id: string;
    /** Note ID that was corrected */
    noteId: string;
    /** Type of correction */
    type: 'add' | 'remove' | 'edit' | 'reorder';
    /** Property key */
    key: string;
    /** Property operator */
    operator: string;
    /** Old values (for edit/remove) */
    oldValues?: string[];
    /** New values (for add/edit) */
    newValues?: string[];
    /** Timestamp */
    timestamp: string;
    /** Source of correction */
    source: 'user' | 'system' | 'model';
    /** Confidence in this correction (user corrections = 1.0) */
    confidence: number;
}

export interface CorrectionPattern {
    /** Pattern ID */
    id: string;
    /** Input text pattern (regex or substring) */
    pattern: string;
    /** Property to extract */
    property: {
        key: string;
        operator: string;
        values: string[];
    };
    /** Number of times this correction was observed */
    count: number;
    /** Confidence in this pattern */
    confidence: number;
    /** Last seen timestamp */
    lastSeen: string;
    /** Example inputs that triggered this pattern */
    examples: string[];
}

export interface CorrectionFlowConfig {
    /** Minimum occurrences before pattern is considered */
    minOccurrences: number;
    /** Minimum confidence to apply pattern */
    minConfidence: number;
    /** Maximum patterns to store */
    maxPatterns: number;
    /** Decay factor for old patterns (0-1) */
    decayFactor: number;
}

/**
 * Correction Flow Manager
 * Collects user corrections and builds extraction improvement patterns
 */
export class CorrectionFlow {
    private patterns: Map<string, CorrectionPattern> = new Map();
    private corrections: Correction[] = [];
    private config: CorrectionFlowConfig;

    constructor(config: Partial<CorrectionFlowConfig> = {}) {
        this.config = {
            minOccurrences: CORRECTION_MIN_OCCURRENCES,
            minConfidence: CORRECTION_MIN_CONFIDENCE,
            maxPatterns: CORRECTION_MAX_PATTERNS,
            decayFactor: CORRECTION_DECAY_FACTOR,
            ...config,
        };
    }

    /**
     * Record a user correction
     */
    recordCorrection(correction: Omit<Correction, 'id' | 'timestamp'>): Correction {
        const fullCorrection: Correction = {
            ...correction,
            id: `corr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            timestamp: new Date().toISOString(),
        };
        this.corrections.push(fullCorrection);
        this.updatePatterns(fullCorrection);
        return fullCorrection;
    }

    /**
     * Update patterns based on a new correction
     */
    private updatePatterns(correction: Correction): void {
        // Only learn from high-confidence user corrections
        if (correction.source !== 'user' || correction.confidence < 0.9) return;

        const patternKey = `${correction.key}::${correction.operator}`;
        const existing = this.patterns.get(patternKey);

        // Extract the corrected value
        const value = correction.type === 'add' || correction.type === 'edit'
            ? correction.newValues?.join(', ')
            : correction.oldValues?.join(', ');

        if (!value) return;

        if (existing) {
            // Update existing pattern
            existing.count++;
            existing.lastSeen = correction.timestamp;
            existing.examples.push(correction.noteId); // Using noteId as proxy for input text
            if (existing.examples.length > CORRECTION_MAX_EXAMPLES) {
                existing.examples.shift();
            }
            // Recompute confidence based on count
            existing.confidence = Math.min(CORRECTION_BASE_CONFIDENCE + (existing.count * CORRECTION_CONFIDENCE_INCREMENT), CORRECTION_MAX_CONFIDENCE);
        } else {
            // Create new pattern
            const pattern: CorrectionPattern = {
                id: `pat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                pattern: '', // Would be filled by analyzing input text
                property: {
                    key: correction.key,
                    operator: correction.operator,
                    values: correction.newValues ?? correction.oldValues ?? [],
                },
                count: 1,
                confidence: CORRECTION_BASE_CONFIDENCE,
                lastSeen: correction.timestamp,
                examples: [correction.noteId],
            };
            this.patterns.set(patternKey, pattern);
        }

        // Prune old/low-confidence patterns
        this.prunePatterns();
    }

    /**
     * Prune patterns based on config limits
     */
    private prunePatterns(): void {
        if (this.patterns.size <= this.config.maxPatterns) return;

        // Sort by confidence * count, remove lowest
        const sorted = Array.from(this.patterns.entries())
            .sort((a, b) => (a[1].confidence * a[1].count) - (b[1].confidence * b[1].count));

        const toRemove = sorted.slice(0, sorted.length - this.config.maxPatterns);
        for (const [key] of toRemove) {
            this.patterns.delete(key);
        }
    }

    /**
     * Get applicable correction patterns for input text
     */
    getPatternsForInput(text: string): CorrectionPattern[] {
        const results: CorrectionPattern[] = [];

        for (const pattern of this.patterns.values()) {
            if (pattern.confidence < this.config.minConfidence) continue;
            if (pattern.count < this.config.minOccurrences) continue;

            // Simple substring match - could be enhanced with regex
            if (text.toLowerCase().includes(pattern.property.key.toLowerCase()) ||
                pattern.examples.some(ex => text.toLowerCase().includes(ex.toLowerCase()))) {
                results.push(pattern);
            }
        }

        return results.sort((a, b) => b.confidence * b.count - a.confidence * a.count);
    }

    /**
     * Apply correction patterns to enhance extraction
     */
    enhanceExtraction(
        text: string,
        extractedProperties: Property[],
        ontology: OntologyNode[]
    ): Property[] {
        const patterns = this.getPatternsForInput(text);
        const properties = new Map<string, Property>();

        // Add existing extracted properties
        for (const prop of extractedProperties) {
            properties.set(`${prop.key}::${prop.operator}`, prop);
        }

        // Apply correction patterns
        for (const pattern of patterns) {
            const id = `${pattern.property.key}::${pattern.property.operator}`;
            if (!properties.has(id)) {
                properties.set(id, {
                    ...pattern.property,
                    confidence: pattern.confidence,
                    provenance: 'inferred',
                });
            }
        }

        return Array.from(properties.values());
    }

    /**
     * Get all recorded corrections
     */
    getCorrections(): Correction[] {
        return [...this.corrections];
    }

    /**
     * Get all learned patterns
     */
    getPatterns(): CorrectionPattern[] {
        return Array.from(this.patterns.values())
            .filter(p => p.count >= this.config.minOccurrences && p.confidence >= this.config.minConfidence)
            .sort((a, b) => b.confidence * b.count - a.confidence * a.count);
    }

    /**
     * Export patterns for persistence
     */
    exportPatterns(): string {
        return JSON.stringify({
            patterns: Array.from(this.patterns.entries()),
            config: this.config,
            exportedAt: new Date().toISOString(),
        }, null, 2);
    }

    /**
     * Import patterns from persistence
     */
    importPatterns(json: string): void {
        const data = JSON.parse(json);
        this.patterns = new Map(data.patterns);
        if (data.config) this.config = { ...this.config, ...data.config };
    }

    /**
     * Compute correction flow metrics
     */
    getMetrics(): {
        totalCorrections: number;
        correctionsByType: Record<string, number>;
        patternsLearned: number;
        patternsApplicable: number;
        avgPatternConfidence: number;
    } {
        const correctionsByType: Record<string, number> = {};
        for (const c of this.corrections) {
            correctionsByType[c.type] = (correctionsByType[c.type] || 0) + 1;
        }

        const patterns = this.getPatterns();
        const avgConfidence = patterns.length > 0
            ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
            : 0;

        return {
            totalCorrections: this.corrections.length,
            correctionsByType,
            patternsLearned: this.patterns.size,
            patternsApplicable: patterns.length,
            avgPatternConfidence: avgConfidence,
        };
    }
}

/**
 * Create a correction from a property diff
 */
export function createCorrectionFromDiff(
    noteId: string,
    oldProps: Property[],
    newProps: Property[],
    source: Correction['source'] = 'user'
): Correction[] {
    const corrections: Correction[] = [];
    const oldMap = new Map<string, Property>();
    const newMap = new Map<string, Property>();

    for (const p of oldProps) oldMap.set(`${p.key}::${p.operator}`, p);
    for (const p of newProps) newMap.set(`${p.key}::${p.operator}`, p);

    // Detect additions and edits
    for (const [key, newProp] of newMap) {
        const oldProp = oldMap.get(key);
        if (!oldProp) {
            corrections.push({
                id: '',
                noteId,
                type: 'add',
                key: newProp.key,
                operator: newProp.operator,
                newValues: newProp.values,
                timestamp: '',
                source,
                confidence: source === 'user' ? 1.0 : 0.5,
            });
        } else if (JSON.stringify(oldProp.values) !== JSON.stringify(newProp.values)) {
            corrections.push({
                id: '',
                noteId,
                type: 'edit',
                key: newProp.key,
                operator: newProp.operator,
                oldValues: oldProp.values,
                newValues: newProp.values,
                timestamp: '',
                source,
                confidence: source === 'user' ? 1.0 : 0.5,
            });
        }
    }

    // Detect removals
    for (const [key, oldProp] of oldMap) {
        if (!newMap.has(key)) {
            corrections.push({
                id: '',
                noteId,
                type: 'remove',
                key: oldProp.key,
                operator: oldProp.operator,
                oldValues: oldProp.values,
                timestamp: '',
                source,
                confidence: source === 'user' ? 1.0 : 0.5,
            });
        }
    }

    return corrections;
}

/**
 * Correction Flow Stage for Extraction Pipeline
 * Applies learned correction patterns during extraction
 */
export class CorrectionFlowStage {
    readonly name = 'correction-flow' as const;
    readonly priority = 5; // Run early, after deterministic

    constructor(private flow: CorrectionFlow) {}

    extract(text: string, ontology: OntologyNode[], context?: { existingProperties?: Property[] }): Property[] {
        const existing = context?.existingProperties ?? [];
        return this.flow.enhanceExtraction(text, existing, ontology);
    }
}

/**
 * Singleton instance
 */
let correctionFlowInstance: CorrectionFlow | null = null;

export function getCorrectionFlow(config?: Partial<CorrectionFlowConfig>): CorrectionFlow {
    if (!correctionFlowInstance) {
        correctionFlowInstance = new CorrectionFlow(config);
    }
    return correctionFlowInstance;
}

export function resetCorrectionFlow(): void {
    correctionFlowInstance = null;
}