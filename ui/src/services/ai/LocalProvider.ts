import type {Note, OntologyNode, Property} from '@notention/core';
import type {AIProvider, InferredAttribute} from './types';
import {collectOntologyKeys, parseProperties, parseQuantity} from '@notention/core';
import {getTextFromHtml} from '../../utils/html';
import {addDays, format} from 'date-fns';

export class LocalAIProvider implements AIProvider {
    name = 'Local (Heuristic)';
    kind = 'heuristic' as const;
    isAvailable = true;

    async generateCompletion(prompt: string): Promise<string> {
        if (prompt.includes("Suggest 5 semantic tags")) {
            return "I can only suggest tags if you ask me about specific text.";
        }
        return 'Local AI provider does not support generic text generation yet.';
    }

    async suggestTags(text: string): Promise<string[]> {
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

    async analyzeOntology(notes: Note[], context?: string): Promise<InferredAttribute[]> {
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

        if (context === 'Project') {
            if (!propertyMap.has('budget')) propertyMap.set('budget', {count: 1, values: new Set(['1000'])});
            if (!propertyMap.has('deadline')) propertyMap.set('deadline', {count: 1, values: new Set(['2024-01-01'])});
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

    async alignToOntology(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        const properties = new Map<string, Property>();

        const add = (key: string, operator: string, value: string) => {
            const values = value.split(',').map(part => part.trim()).filter(Boolean);
            if (values.length === 0) return;
            const id = `${key}\u0000${operator}`;
            const existing = properties.get(id);
            if (existing) {
                values.forEach(v => existing.values.includes(v) || existing.values.push(v));
                return;
            }
            properties.set(id, {key, operator, values});
        };

        const lowerText = text.toLowerCase();

        // --- Price / Cost (Refined) ---
        const lessThanMatch = text.match(/(?:under|below|less than)\s*([$€£])?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(usd|eur|gbp|sats))?/i);
        if (lessThanMatch) {
            const symbol = lessThanMatch[1] || '';
            const suffix = lessThanMatch[3] || '';
            const quantity = parseQuantity(`${symbol}${lessThanMatch[2]} ${suffix}`.trim());
            add('price', 'less than', quantity ? `${quantity.value} ${quantity.unit}` : lessThanMatch[2]);
        }

        const greaterThanMatch = text.match(/(?:over|above|more than)\s*([$€£])?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(usd|eur|gbp|sats))?/i);
        if (greaterThanMatch) {
            const symbol = greaterThanMatch[1] || '';
            const suffix = greaterThanMatch[3] || '';
            const quantity = parseQuantity(`${symbol}${greaterThanMatch[2]} ${suffix}`.trim());
            add('price', 'greater than', quantity ? `${quantity.value} ${quantity.unit}` : greaterThanMatch[2]);
        }

        if (!lessThanMatch && !greaterThanMatch) {
            const priceMatch = text.match(/([$€£])\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);
            if (priceMatch) {
                const quantity = parseQuantity(`${priceMatch[1]}${priceMatch[2]}`);
                add('price', 'is', quantity ? `${quantity.value} ${quantity.unit}` : priceMatch[2]);
            } else {
                const currencyMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(USD|EUR|GBP|sats)/i);
                if (currencyMatch) {
                    const quantity = parseQuantity(`${currencyMatch[1]} ${currencyMatch[2]}`);
                    add('price', 'is', quantity ? `${quantity.value} ${quantity.unit}` : currencyMatch[1]);
                }
            }
        }

        // --- Intent & Role ---
        const roleRequestMatch = text.match(/(?:looking for|hiring|need) (?:a|an)\s+([a-zA-Z\s]+?)(?=(?:[\.,]|\s+(?:for|in|to|with)|$))/i);
        if (roleRequestMatch) {
            const role = roleRequestMatch[1].trim();
            if (role.split(' ').length < 5) add('role', 'contains', role);
        }

        const roleOfferMatch = text.match(/i am (?:a|an)\s+([a-zA-Z\s]+?)(?=(?:[\.,]|\s+(?:who|with|looking)|$))/i);
        if (roleOfferMatch) {
            const role = roleOfferMatch[1].trim();
            if (role.split(' ').length < 5) add('role', 'is', role);
        }

        // --- Range ---
        const rangeMatch = text.match(/(?:between|from)?\s*(\$|€|£)?\s*(\d+)\s*(?:and|to|-)\s*(\$|€|£)?\s*(\d+)\s*(?:usd|eur|gbp)?/i);
        if (rangeMatch) {
            const [, , min, , max] = rangeMatch;
            if (min && max && Number(max) > Number(min)) add('price', 'between', `${min},${max}`);
        }

        // --- Dates (Enhanced) ---
        const today = new Date();
        if (lowerText.includes('due tomorrow') || lowerText.includes('deadline tomorrow')) {
            add('deadline', 'is', format(addDays(today, 1), 'yyyy-MM-dd'));
        }
        if (lowerText.includes('due today') || lowerText.includes('deadline today')) {
            add('deadline', 'is', format(today, 'yyyy-MM-dd'));
        }
        if (lowerText.includes('next week')) {
            add('deadline', 'is', format(addDays(today, 7), 'yyyy-MM-dd'));
        }

        const inDaysMatch = lowerText.match(/(?:in|within) (\d+) days/);
        if (inDaysMatch) {
            add('deadline', 'is', format(addDays(today, parseInt(inDaysMatch[1])), 'yyyy-MM-dd'));
        }

        // --- Email ---
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) add('email', 'is', emailMatch[0]);

        // --- Ontology-based Extraction (Enhanced) ---
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
            add(key, operator, quantity?.unit ? `${quantity.value} ${quantity.unit}` : value);
        });

        return Array.from(properties.values());
    }

    async optimizeOntology(_ontology: OntologyNode[]): Promise<{
        merged: { source: string, target: string }[],
        pruned: string[]
    }> {
        return {merged: [], pruned: []};
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
