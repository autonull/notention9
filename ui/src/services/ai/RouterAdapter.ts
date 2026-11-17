import type {AIProvider, ProviderKind, InferredAttribute} from './types';
import type {Note, OntologyNode, Property} from '@notention/core';
import {inferenceRouter, type InferenceOptions, type RedactionInfo} from './inference';

export class RouterAdapter implements AIProvider {
    name = 'Inference Router';
    kind = 'heuristic' as ProviderKind;
    isAvailable = true;

    private defaultOptions: InferenceOptions = {
        timeout: 30000,
        maxRetries: 2,
        autoRepair: true,
    };
    private lastRedactionInfo: RedactionInfo | null = null;

    async generateCompletion(prompt: string): Promise<string> {
        const result = await inferenceRouter.generateCompletion(prompt, this.defaultOptions);
        this.lastRedactionInfo = result.redactionInfo ?? null;
        if (result.error) throw result.error;
        return result.data || '';
    }

    async suggestTags(text: string, ontology?: OntologyNode[]): Promise<string[]> {
        const result = await inferenceRouter.suggestTags(text, ontology, this.defaultOptions);
        this.lastRedactionInfo = result.redactionInfo ?? null;
        if (result.error) throw result.error;
        return result.data || [];
    }

    async analyzeOntology(notes: Note[], context?: string): Promise<InferredAttribute[]> {
        const result = await inferenceRouter.analyzeOntology(notes, context, this.defaultOptions);
        this.lastRedactionInfo = result.redactionInfo ?? null;
        if (result.error) throw result.error;
        return result.data || [];
    }

    async alignToOntology(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        const result = await inferenceRouter.alignToOntology(text, ontology, this.defaultOptions);
        this.lastRedactionInfo = result.redactionInfo ?? null;
        if (result.error) throw result.error;
        return result.data || [];
    }

    async optimizeOntology(ontology: OntologyNode[]): Promise<{
        merged: {source: string, target: string}[],
        pruned: string[]
    }> {
        const result = await inferenceRouter.optimizeOntology(ontology, this.defaultOptions);
        this.lastRedactionInfo = result.redactionInfo ?? null;
        if (result.error) throw result.error;
        return result.data || {merged: [], pruned: []};
    }

    getLastRedactionInfo(): RedactionInfo | null {
        return this.lastRedactionInfo;
    }

    setDefaultOptions(options: InferenceOptions): void {
        this.defaultOptions = {...this.defaultOptions, ...options};
    }
}

export const routerAdapter = new RouterAdapter();