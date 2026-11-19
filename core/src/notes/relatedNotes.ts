import type { Note, Property } from '../types/index.js';
import { CoOccurrenceRecorder } from '../ontology/CoOccurrenceRecorder.js';
import { CoOccurrenceAnalyzer } from '../ontology/CoOccurrenceAnalyzer.js';
import { buildAttributeIndex, collectOntologyKeys } from '../ontology/index.js';

/**
 * Configuration for related notes discovery
 */
export interface RelatedNotesOptions {
    /** Maximum number of related notes to return */
    limit?: number;
    /** Minimum score threshold (0-1) */
    minScore?: number;
    /** Include notes with only tag overlap */
    includeTagOnly?: boolean;
    /** Weight for shared property keys */
    propertyWeight?: number;
    /** Weight for shared tags */
    tagWeight?: number;
    /** Weight for co-occurrence score */
    coOccurrenceWeight?: number;
}

/**
 * A related note with its relevance score and reasons
 */
export interface RelatedNote {
    note: Note;
    score: number;
    reasons: RelatedReason[];
}

/**
 * Reason why a note is related
 */
export interface RelatedReason {
    type: 'property' | 'tag' | 'cooccurrence';
    key: string;
    weight: number;
    details?: string;
}

/**
 * Default options for related notes
 */
const DEFAULT_OPTIONS: Required<RelatedNotesOptions> = {
    limit: 10,
    minScore: 0.1,
    includeTagOnly: true,
    propertyWeight: 0.5,
    tagWeight: 0.3,
    coOccurrenceWeight: 0.2,
};

/**
 * Service for finding related notes using shared properties, tags, and co-occurrence data.
 * Uses indexed lookups for O(n) performance instead of O(n²) scans.
 */
export class RelatedNotesService {
    private notes: Note[];
    private coOccurrenceRecorder: CoOccurrenceRecorder;
    private attributeIndex: Map<string, any>;
    private ontologyKeys: Set<string>;
    private propertyIndex: Map<string, Set<string>>; // property key -> note IDs
    private tagIndex: Map<string, Set<string>>; // tag -> note IDs
    private options: Required<RelatedNotesOptions>;

    constructor(
        notes: Note[],
        coOccurrenceRecorder: CoOccurrenceRecorder,
        ontology: any[],
        options: RelatedNotesOptions = {}
    ) {
        this.notes = notes;
        this.coOccurrenceRecorder = coOccurrenceRecorder;
        this.attributeIndex = buildAttributeIndex(ontology);
        this.ontologyKeys = collectOntologyKeys(ontology);
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.propertyIndex = new Map();
        this.tagIndex = new Map();
        this.buildIndexes();
    }

    /**
     * Rebuild the service with new notes (for reactivity)
     */
    updateNotes(notes: Note[]): void {
        this.notes = notes;
        this.buildIndexes();
    }

    /**
     * Build inverted indexes for O(1) property/tag lookups
     */
    private buildIndexes(): void {
        this.propertyIndex.clear();
        this.tagIndex.clear();

        for (const note of this.notes) {
            // Index property keys
            for (const prop of note.properties) {
                const key = prop.key;
                if (!this.propertyIndex.has(key)) {
                    this.propertyIndex.set(key, new Set());
                }
                this.propertyIndex.get(key)!.add(note.id);
            }

            // Index tags
            for (const tag of note.tags) {
                if (!this.tagIndex.has(tag)) {
                    this.tagIndex.set(tag, new Set());
                }
                this.tagIndex.get(tag)!.add(note.id);
            }
        }
    }

    /**
     * Find notes related to the given note
     */
    findRelated(targetNote: Note): RelatedNote[] {
        const scores = new Map<string, { score: number; reasons: RelatedReason[] }>();

        // 1. Score by shared property keys (weighted by ontology presence)
        this.scoreByProperties(targetNote, scores);

        // 2. Score by shared tags
        this.scoreByTags(targetNote, scores);

        // 3. Score by co-occurrence data
        this.scoreByCoOccurrence(targetNote, scores);

        // Convert to array, filter, sort, and limit
        const results: RelatedNote[] = [];
        for (const [noteId, { score, reasons }] of scores.entries()) {
            if (noteId === targetNote.id) continue; // Exclude self
            if (score < this.options.minScore) continue;

            const note = this.notes.find(n => n.id === noteId);
            if (note) {
                results.push({ note, score, reasons });
            }
        }

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        return results.slice(0, this.options.limit);
    }

    /**
     * Score notes by shared property keys
     */
    private scoreByProperties(targetNote: Note, scores: Map<string, { score: number; reasons: RelatedReason[] }>): void {
        const targetKeys = new Set(targetNote.properties.map(p => p.key));
        const ontologyKeys = this.ontologyKeys;

        for (const key of targetKeys) {
            const noteIds = this.propertyIndex.get(key);
            if (!noteIds) continue;

            // Weight: higher for ontology-defined keys, lower for unknown keys
            const isOntologyKey = ontologyKeys.has(key);
            const baseWeight = this.options.propertyWeight;
            const weight = isOntologyKey ? baseWeight : baseWeight * 0.5;

            for (const noteId of noteIds) {
                if (noteId === targetNote.id) continue;

                const entry = scores.get(noteId) ?? { score: 0, reasons: [] };
                entry.score += weight;
                entry.reasons.push({
                    type: 'property',
                    key,
                    weight,
                    details: isOntologyKey ? 'Shared ontology property' : 'Shared custom property',
                });
                scores.set(noteId, entry);
            }
        }
    }

    /**
     * Score notes by shared tags
     */
    private scoreByTags(targetNote: Note, scores: Map<string, { score: number; reasons: RelatedReason[] }>): void {
        if (!this.options.includeTagOnly && targetNote.properties.length === 0) return;

        const targetTags = new Set(targetNote.tags);
        if (targetTags.size === 0) return;

        for (const tag of targetTags) {
            const noteIds = this.tagIndex.get(tag);
            if (!noteIds) continue;

            for (const noteId of noteIds) {
                if (noteId === targetNote.id) continue;

                const entry = scores.get(noteId) ?? { score: 0, reasons: [] };
                entry.score += this.options.tagWeight;
                entry.reasons.push({
                    type: 'tag',
                    key: tag,
                    weight: this.options.tagWeight,
                    details: `Shared tag: ${tag}`,
                });
                scores.set(noteId, entry);
            }
        }
    }

    /**
     * Score notes by co-occurrence of property keys
     */
    private scoreByCoOccurrence(targetNote: Note, scores: Map<string, { score: number; reasons: RelatedReason[] }>): void {
        const targetKeys = targetNote.properties.map(p => p.key);
        if (targetKeys.length === 0) return;

        // Use CoOccurrenceAnalyzer to find keys that commonly co-occur with target keys
        const analyzer = new CoOccurrenceAnalyzer(
            this.coOccurrenceRecorder,
            [], // ontology not needed for co-occurrence lookup
            this.attributeIndex,
            { getUnknownSamples: () => new Map() }
        );

        const suggestions = analyzer.getContextualSuggestions(targetKeys, 20);

        for (const suggestion of suggestions) {
            const noteIds = this.propertyIndex.get(suggestion.key);
            if (!noteIds) continue;

            // Weight by co-occurrence confidence
            const weight = this.options.coOccurrenceWeight * suggestion.confidence;

            for (const noteId of noteIds) {
                if (noteId === targetNote.id) continue;

                const entry = scores.get(noteId) ?? { score: 0, reasons: [] };
                entry.score += weight;
                entry.reasons.push({
                    type: 'cooccurrence',
                    key: suggestion.key,
                    weight,
                    details: `Co-occurs with ${targetKeys.join(', ')} (${(suggestion.confidence * 100).toFixed(0)}% confidence)`,
                });
                scores.set(noteId, entry);
            }
        }
    }

    /**
     * Get backlinks: notes that reference this note (via inResponseTo or similar properties)
     */
    findBacklinks(targetNote: Note): Note[] {
        const backlinks: Note[] = [];

        for (const note of this.notes) {
            if (note.id === targetNote.id) continue;

            // Check for explicit reference properties
            for (const prop of note.properties) {
                if (prop.key === 'inResponseTo' && prop.values.includes(targetNote.id)) {
                    backlinks.push(note);
                    break;
                }
                if (prop.key === 'references' && prop.values.includes(targetNote.id)) {
                    backlinks.push(note);
                    break;
                }
                if (prop.key === 'relatedTo' && prop.values.includes(targetNote.id)) {
                    backlinks.push(note);
                    break;
                }
            }
        }

        return backlinks;
    }
}

/**
 * Create a RelatedNotesService with default configuration
 */
export function createRelatedNotesService(
    notes: Note[],
    coOccurrenceRecorder: CoOccurrenceRecorder,
    ontology: any[],
    options?: RelatedNotesOptions
): RelatedNotesService {
    return new RelatedNotesService(notes, coOccurrenceRecorder, ontology, options);
}