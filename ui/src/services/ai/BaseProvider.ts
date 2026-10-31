import type {Note, OntologyNode, Property} from '@notention/core';
import type {AIProvider, ProviderKind, InferredAttribute} from './types';
import {stripJsonFence, parsePropertiesJson, Logger} from '@notention/core';

/**
 * Base class for AI providers - eliminates duplication between LocalProvider and RemoteProvider
 */
export abstract class BaseAIProvider implements AIProvider {
    abstract readonly name: string;
    abstract readonly kind: ProviderKind;
    abstract readonly isAvailable: boolean;

    protected readonly logger = Logger.getInstance();

    async generateCompletion(prompt: string): Promise<string> {
        throw new Error(`${this.name} does not support generic text generation`);
    }

    async suggestTags(text: string, _ontology?: OntologyNode[]): Promise<string[]> {
        try {
            return await this.doSuggestTags(text);
        } catch (e) {
            this.logger.error('Tag Suggestion Error:', e as Error);
            return [];
        }
    }

    protected abstract doSuggestTags(text: string): Promise<string[]>;

    async analyzeOntology(notes: Note[], _context?: string): Promise<InferredAttribute[]> {
        try {
            return await this.doAnalyzeOntology(notes);
        } catch (e) {
            this.logger.error('Ontology Analysis Error:', e as Error);
            return [];
        }
    }

    protected abstract doAnalyzeOntology(notes: Note[]): Promise<InferredAttribute[]>;

    async optimizeOntology(_ontology: OntologyNode[]): Promise<{
        merged: { source: string, target: string }[],
        pruned: string[]
    }> {
        try {
            return await this.doOptimizeOntology(_ontology);
        } catch (e) {
            this.logger.error('Optimization Error:', e as Error);
            return {merged: [], pruned: []};
        }
    }

    protected abstract doOptimizeOntology(ontology: OntologyNode[]): Promise<{
        merged: { source: string, target: string }[],
        pruned: string[]
    }>;

    async alignToOntology(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        try {
            return await this.doAlignToOntology(text, ontology);
        } catch (e) {
            this.logger.error('Alignment Error:', e as Error);
            return [];
        }
    }

    protected abstract doAlignToOntology(text: string, ontology: OntologyNode[]): Promise<Property[]>;

    /**
     * Safely parse JSON with fence stripping
     */
    protected parseJson<T>(result: string, fallback: T): T {
        try {
            return parsePropertiesJson(JSON.parse(stripJsonFence(result))) as T;
        } catch {
            return fallback;
        }
    }

    /**
     * Parse JSON array with fence stripping
     */
    protected parseJsonArray<T>(result: string, fallback: T[] = []): T[] {
        try {
            return JSON.parse(stripJsonFence(result)) as T[];
        } catch {
            return fallback;
        }
    }

    /**
     * Parse JSON object with fence stripping
     */
    protected parseJsonObject<T>(result: string, fallback: T): T {
        try {
            return JSON.parse(stripJsonFence(result)) as T;
        } catch {
            return fallback;
        }
    }
}