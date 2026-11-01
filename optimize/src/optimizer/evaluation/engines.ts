import { ExtractionPipeline, createExtractionPipeline } from '@notention/core/extraction';
import { MatchEngine } from '@notention/core/matching';
import { type OntologyNode, type Note, type Property } from '@notention/core/types';
import { DEFAULT_ONTOLOGY } from '@notention/core/ontology';
import { MILLISECONDS_PER_DAY, MILLISECONDS_PER_TWO_DAYS } from '../constants.js';

/**
 * Extraction engine for evaluation
 */
export interface ExtractionEngine {
    extract(input: string): Promise<Record<string, string[]>>;
}

/**
 * Match engine for evaluation
 */
export interface MatchEngineInterface {
    match(query: string, notes: Note[]): Promise<Array<{ noteId: string; score: number }>>;
}

/**
 * Create extraction engine for evaluation
 */
export function createExtractionEngine(): ExtractionEngine {
    const pipeline = createExtractionPipeline();
    return {
        async extract(input: string): Promise<Record<string, string[]>> {
            const result = await pipeline.extract(input, DEFAULT_ONTOLOGY);
            const extracted: Record<string, string[]> = {};
            for (const prop of result.properties) {
                extracted[prop.key] = prop.values;
            }
            return extracted;
        },
    };
}

/**
 * Create match engine for evaluation
 */
export function createMatchEngine(): MatchEngineInterface {
    const matchEngine = new MatchEngine(DEFAULT_ONTOLOGY);
    return {
        async match(query: string, notes: Note[]): Promise<Array<{ noteId: string; score: number }>> {
            const extractionPipeline = createExtractionPipeline();
            const extractionResult = await extractionPipeline.extract(query, DEFAULT_ONTOLOGY);
            const requestProps = extractionResult.properties;

            const now = new Date().toISOString();
            const requestNote: Note = {
                id: 'query',
                title: '',
                content: query,
                properties: requestProps,
                tags: [],
                createdAt: now,
                updatedAt: now,
                status: 'open',
                source: { type: 'user', identifier: 'test', timestamp: Date.now() },
                privacy: 'private',
                priority: 0,
            };

            const results: Array<{ noteId: string; score: number }> = [];
            for (const note of notes) {
                const matchResult = matchEngine.calculateMatchScore(requestNote, note);
                results.push({ noteId: note.id, score: matchResult.score });
            }
            return results.sort((a, b) => b.score - a.score);
        },
    };
}

/**
 * Create sample notes for evaluation
 */
export function createSampleNotes(): Note[] {
    const now = new Date().toISOString();
    const dayAgo = new Date(Date.now() - MILLISECONDS_PER_DAY).toISOString();
    const twoDaysAgo = new Date(Date.now() - MILLISECONDS_PER_TWO_DAYS).toISOString();

    return [
        {
            id: 'note-ramp-001',
            title: 'Wheelchair Ramp Installation Service',
            content: 'Professional wheelchair ramp installation before Friday, budget 850 USD',
            properties: [
                { key: 'role', operator: 'is', values: ['wheelchair ramp installer'] },
                { key: 'deadline', operator: 'less than', values: ['Friday'] },
                { key: 'budget', operator: 'less than', values: ['850 USD'] },
            ],
            tags: ['care', 'accessibility', 'service'],
            createdAt: dayAgo,
            updatedAt: dayAgo,
            status: 'open',
            source: { type: 'user', identifier: 'test', timestamp: Date.now() - MILLISECONDS_PER_DAY },
            privacy: 'private',
            priority: 0,
        },
        {
            id: 'note-ramp-002',
            title: 'Accessibility Ramp Build',
            content: 'Building an accessibility ramp for home entry, can complete by Thursday, 900 USD',
            properties: [
                { key: 'role', operator: 'is', values: ['wheelchair ramp builder'] },
                { key: 'deadline', operator: 'less than', values: ['Thursday'] },
                { key: 'budget', operator: 'less than', values: ['900 USD'] },
            ],
            tags: ['care', 'accessibility', 'construction'],
            createdAt: twoDaysAgo,
            updatedAt: twoDaysAgo,
            status: 'open',
            source: { type: 'user', identifier: 'test', timestamp: Date.now() - MILLISECONDS_PER_TWO_DAYS },
            privacy: 'private',
            priority: 0,
        },
        {
            id: 'note-other-001',
            title: 'Garden Maintenance',
            content: 'Weekly garden maintenance service, 50 USD per visit',
            properties: [
                { key: 'role', operator: 'is', values: ['gardener'] },
                { key: 'budget', operator: 'equals', values: ['50 USD'] },
            ],
            tags: ['home', 'maintenance'],
            createdAt: now,
            updatedAt: now,
            status: 'open',
            source: { type: 'user', identifier: 'test', timestamp: Date.now() },
            privacy: 'private',
            priority: 0,
        },
    ];
}