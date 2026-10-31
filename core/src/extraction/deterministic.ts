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
import { addProperty, hasProperty, getProperties, makePropertyId } from './propertyUtils.js';

export function alignToOntology(
    text: string,
    ontology: OntologyNode[],
    options?: { ontologyService?: OntologyService }
): Property[] {
    const ontologyService = options?.ontologyService ?? new OntologyService(ontology);
    const properties = new Map<string, Property>();
    const lowerText = text.toLowerCase();

    // --- Core extractors (moved from propertyExtractor/extractors.ts) ---

    // Intents
    for (const intent of INTENTS) {
        if (intent.regex.test(text)) {
            addProperty(properties, 'intent', 'is', intent.key);
        }
    }

    // Regex-based properties
    const sendToMatch = text.match(CORE_PATTERNS.SEND_TO);
    if (sendToMatch) addProperty(properties, 'to', 'send to', sendToMatch[1]);

    const channelMatch = text.match(CORE_PATTERNS.CHANNEL);
    if (channelMatch) {
        const channel = channelMatch[1].toLowerCase();
        if (ontologyService.getEnumOptions('channel')?.includes(channel)) {
            addProperty(properties, 'channel', 'is', channel);
        }
    }

    const phoneMatch = text.match(REGEX.PHONE);
    if (phoneMatch && !hasProperty(properties, 'to', 'send to') && !hasProperty(properties, 'from', 'is')) {
        addProperty(properties, 'from', 'is', phoneMatch[1]);
    }

    const emailMatch = text.match(REGEX.EMAIL);
    if (emailMatch) addProperty(properties, 'email', 'is', emailMatch[0]);

    const budgetMatch = text.match(REGEX.BUDGET);
    if (budgetMatch) {
        const amount = (budgetMatch[1] || budgetMatch[2]).replace(/,/g, '');
        addProperty(properties, 'budget', 'is', amount);
    }

    // Location
    const locationMatch = LOCATION_PATTERNS.find(p => p.regex.test(text));
    if (locationMatch) {
        const location = text.match(locationMatch.regex)![0].replace(locationMatch.prefix, '').trim();
        addProperty(properties, 'location', 'is near', location);
    }

    // Date
    const datePattern = DATE_PATTERNS.find(p => p.regex.test(text));
    if (datePattern) {
        const date = new Date();
        date.setDate(date.getDate() + datePattern.offset);
        addProperty(properties, 'date', 'is', date.toISOString().split('T')[0]);
    }

    // Fuzzy (ontology-based, conservative)
    const words = text.split(/\s+/);
    const existingKeys = new Set<string>();
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

    // --- UI LocalProvider heuristics (moved from ui/src/services/ai/LocalProvider.ts) ---

    // Price / Cost (Refined)
    const lessThanMatch = text.match(/(?:under|below|less than)\s*([$€£])?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(usd|eur|gbp|sats))?/i);
    if (lessThanMatch) {
        const symbol = lessThanMatch[1] || '';
        const suffix = lessThanMatch[3] || '';
        const quantity = parseQuantity(`${symbol}${lessThanMatch[2]} ${suffix}`.trim());
        addProperty(properties, 'price', 'less than', quantity ? `${quantity.value} ${quantity.unit}` : lessThanMatch[2]);
    }

    const greaterThanMatch = text.match(/(?:over|above|more than)\s*([$€£])?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(usd|eur|gbp|sats))?/i);
    if (greaterThanMatch) {
        const symbol = greaterThanMatch[1] || '';
        const suffix = greaterThanMatch[3] || '';
        const quantity = parseQuantity(`${symbol}${greaterThanMatch[2]} ${suffix}`.trim());
        addProperty(properties, 'price', 'greater than', quantity ? `${quantity.value} ${quantity.unit}` : greaterThanMatch[2]);
    }

    if (!lessThanMatch && !greaterThanMatch) {
        const priceMatch = text.match(/([$€£])\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);
        if (priceMatch) {
            const quantity = parseQuantity(`${priceMatch[1]}${priceMatch[2]}`);
            addProperty(properties, 'price', 'is', quantity ? `${quantity.value} ${quantity.unit}` : priceMatch[2]);
        } else {
            const currencyMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(USD|EUR|GBP|sats)/i);
            if (currencyMatch) {
                const quantity = parseQuantity(`${currencyMatch[1]} ${currencyMatch[2]}`);
                addProperty(properties, 'price', 'is', quantity ? `${quantity.value} ${quantity.unit}` : currencyMatch[1]);
            }
        }
    }

    // Intent & Role
    const roleRequestMatch = text.match(/(?:looking for|hiring|need) (?:a|an)\s+([a-zA-Z\s]+?)(?=(?:[\.,]|\s+(?:for|in|to|with)|$))/i);
    if (roleRequestMatch) {
        const role = roleRequestMatch[1].trim();
        if (role.split(' ').length < 5) addProperty(properties, 'role', 'contains', role);
    }

    const roleOfferMatch = text.match(/i am (?:a|an)\s+([a-zA-Z\s]+?)(?=(?:[\.,]|\s+(?:who|with|looking|in|for)|$))/i);
    if (roleOfferMatch) {
        const role = roleOfferMatch[1].trim();
        if (role.split(' ').length < 5) addProperty(properties, 'role', 'is', role);
    }

    // Range
    const rangeMatch = text.match(/(?:between|from)?\s*(\$|€|£)?\s*(\d+)\s*(?:and|to|-)\s*(\$|€|£)?\s*(\d+)\s*(?:usd|eur|gbp)?/i);
    if (rangeMatch) {
        const [, , min, , max] = rangeMatch;
        if (min && max && Number(max) > Number(min)) addProperty(properties, 'price', 'between', `${min},${max}`);
    }

    // Dates (Enhanced)
    const today = new Date();
    if (lowerText.includes('due tomorrow') || lowerText.includes('deadline tomorrow')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        addProperty(properties, 'deadline', 'is', tomorrow.toISOString().split('T')[0]);
    }
    if (lowerText.includes('due today') || lowerText.includes('deadline today')) {
        addProperty(properties, 'deadline', 'is', today.toISOString().split('T')[0]);
    }
    if (lowerText.includes('next week')) {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        addProperty(properties, 'deadline', 'is', nextWeek.toISOString().split('T')[0]);
    }

    const inDaysMatch = lowerText.match(/(?:in|within) (\d+) days/);
    if (inDaysMatch) {
        const future = new Date(today);
        future.setDate(future.getDate() + parseInt(inDaysMatch[1]));
        addProperty(properties, 'deadline', 'is', future.toISOString().split('T')[0]);
    }

    // Email (already handled above, but kept for completeness)
    // const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    // if (emailMatch) addProperty(properties, 'email', 'is', emailMatch[0]);

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
        const canonicalKey = getCanonicalKey(key, ontology);
        addProperty(properties, canonicalKey, operator, quantity?.unit ? `${quantity.value} ${quantity.unit}` : value);
    });

    return getProperties(properties);
}

export interface AlignmentExplanation {
    property: Property;
    matchedBy: 'regex' | 'ontology-key' | 'intent' | 'fuzzy' | 'price' | 'date' | 'role' | 'range';
}

export function explainAlignment(text: string, properties: Property[]): AlignmentExplanation[] {
    const lowerText = text.toLowerCase();
    const explanations: AlignmentExplanation[] = [];

    for (const property of properties) {
        let matchedBy: AlignmentExplanation['matchedBy'] = 'regex';

        // Check which extractor likely produced this property
        if (INTENTS.some(i => i.key === property.key && i.regex.test(text))) {
            matchedBy = 'intent';
        } else if (['price', 'budget'].includes(property.key)) {
            matchedBy = 'price';
        } else if (['date', 'deadline'].includes(property.key)) {
            matchedBy = 'date';
        } else if (property.key === 'role') {
            matchedBy = 'role';
        } else if (property.key === 'price' && property.operator === 'between') {
            matchedBy = 'range';
        } else if (collectOntologyKeys([{ attributes: { [property.key]: {} } } as any]).has(property.key)) {
            matchedBy = 'ontology-key';
        } else if (LOCATION_PATTERNS.some(p => p.regex.test(text)) && property.key === 'location') {
            matchedBy = 'regex';
        } else if (DATE_PATTERNS.some(p => p.regex.test(text)) && ['date', 'deadline'].includes(property.key)) {
            matchedBy = 'date';
        } else {
            matchedBy = 'fuzzy';
        }

        explanations.push({ property, matchedBy });
    }

    return explanations;
}