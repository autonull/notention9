import type {Note, OntologyNode, Property} from '@notention/core';
import type {InferredAttribute} from './types';
import {BaseAIProvider} from './BaseProvider.js';
import {collectOntologyKeys, parseProperties, parseQuantity, ExtractionPipeline} from '@notention/core';
import {getTextFromHtml} from '../../utils/html';
import {addDays, format} from 'date-fns';

export class LocalAIProvider extends BaseAIProvider {
    readonly name = 'Local (Heuristic)';
    readonly kind = 'heuristic' as const;
    readonly isAvailable = true;

    async generateCompletion(prompt: string): Promise<string> {
        if (prompt.includes("Suggest 5 semantic tags")) {
            return "I can only suggest tags if you ask me about specific text.";
        }
        return 'Local AI provider does not support generic text generation yet.';
    }

    protected async doSuggestTags(text: string): Promise<string[]> {
        const tags = new Set<string>();

        const matches = text.match(/#[\w-]+/g);
        if (matches) {
            matches.forEach(t => tags.add(t.slice(1)));
        }

        const lower = text.toLowerCase();

        if (lower.includes('todo') || lower.includes('task') || lower.includes('do:')) {
            tags.add('task');
        }
        if (lower.includes('meeting') || lower.includes('call with') || lower.includes('sync')) {
            tags.add('meeting');
        }
        if (lower.includes('idea') || lower.includes('concept') || lower.includes('maybe')) {
            tags.add('idea');
        }
        if (lower.includes('bug') || lower.includes('fix') || lower.includes('error')) {
            tags.add('bug');
        }
        if (lower.includes('http') || lower.includes('www')) {
            tags.add('link');
        }

        if (lower.includes('project')) {
            tags.add('project');
        }

        return Array.from(tags);
    }

    protected async doAnalyzeOntology(notes: Note[]): Promise<InferredAttribute[]> {
        const propertyMap = new Map<string, { count: number; values: Set<string> }>();

        for (const note of notes) {
            const props = note.properties.length > 0
                ? note.properties
                : parseProperties(getTextFromHtml(note.content));

            for (const prop of props) {
                if (!propertyMap.has(prop.key)) {
                    propertyMap.set(prop.key, {count: 0, values: new Set()});
                }
                const entry = propertyMap.get(prop.key)!;
                entry.count++;
                prop.values.forEach(v => entry.values.add(v));
            }
        }

        const attributes: InferredAttribute[] = [];

        for (const [key, stats] of propertyMap.entries()) {
            if (stats.count < 1) continue;

            const values = Array.from(stats.values);
            const type = this.inferType(values);

            attributes.push({
                key,
                type,
                usageCount: stats.count,
                sampleValues: values.slice(0, 5),
                description: `Automatically inferred from ${stats.count} notes.`
            });
        }

        return attributes;
    }

    protected async doOptimizeOntology(_ontology: OntologyNode[]): Promise<{
        merged: { source: string, target: string }[],
        pruned: string[]
    }> {
        return {merged: [], pruned: []};
    }

    protected async doAlignToOntology(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        const pipeline = new ExtractionPipeline();
        const result = await pipeline.extract(text, ontology);
        return result.properties;
    }

    private inferType(values: string[]): InferredAttribute['type'] {
        if (values.length === 0) return 'string';

        const allNumbers = values.every(v => !isNaN(parseFloat(v)) && isFinite(Number(v)));
        if (allNumbers) return 'number';

        const allDates = values.every(v => !isNaN(Date.parse(v)));
        if (allDates) return 'date';

        if (values.length < 5) return 'enum';

        return 'string';
    }
}