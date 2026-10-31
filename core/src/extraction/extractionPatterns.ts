/**
 * Shared extraction patterns and utilities
 * Consolidates regex patterns and helper functions used across extraction stages
 */

import type { Property } from '../types/index.js';
import { addProperty, getProperties, hasProperty } from './propertyUtils.js';
import { parseQuantity } from '../notes/quantities/index.js';
import { OntologyService } from '../ontology/ontologyService.js';
import { REGEX } from '../notes/parsing/constants.js';
import {
    PATTERNS as CORE_PATTERNS,
    INTENTS,
    LOCATION_PATTERNS,
    DATE_PATTERNS,
    STOP_WORDS
} from '../notes/propertyExtractor/patterns.js';

/**
 * Extract date-related properties from text
 * Shared between DeterministicStage and PatternStage
 */
export function extractDates(
    text: string,
    lowerText: string,
    properties: Map<string, Property>,
    options: { dates?: boolean } = {}
): void {
    if (options.dates === false) return;

    const today = new Date();

    // Simple relative dates
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

    // DATE_PATTERNS from patterns.ts (used by DeterministicStage)
    const datePattern = DATE_PATTERNS.find(p => p.regex.test(text));
    if (datePattern) {
        const date = new Date();
        date.setDate(date.getDate() + datePattern.offset);
        addProperty(properties, 'date', 'is', date.toISOString().split('T')[0]);
    }
}

/**
 * Extract price/cost properties from text
 * Shared between DeterministicStage and PatternStage
 */
export function extractPrices(
    text: string,
    properties: Map<string, Property>,
    options: { price?: boolean; ranges?: boolean } = {}
): void {
    if (options.price === false) return;

    // Comparative prices (under/over)
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

    // Exact prices (if no comparative match)
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

    // Price ranges
    if (options.ranges !== false) {
        const rangeMatch = text.match(/(?:between|from)?\s*(\$|€|£)?\s*(\d+)\s*(?:and|to|-)\s*(\$|€|£)?\s*(\d+)\s*(?:usd|eur|gbp)?/i);
        if (rangeMatch) {
            const [, , min, , max] = rangeMatch;
            if (min && max && Number(max) > Number(min)) {
                addProperty(properties, 'price', 'between', `${min},${max}`);
            }
        }
    }

    // Budget regex (from DeterministicStage)
    const budgetMatch = text.match(REGEX.BUDGET);
    if (budgetMatch) {
        const amount = (budgetMatch[1] || budgetMatch[2]).replace(/,/g, '');
        addProperty(properties, 'budget', 'is', amount);
    }
}

/**
 * Extract role properties from text
 */
export function extractRoles(
    text: string,
    properties: Map<string, Property>,
    options: { roles?: boolean } = {}
): void {
    if (options.roles === false) return;

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
}

/**
 * Extract location properties from text
 */
export function extractLocations(
    text: string,
    ontology: import('../types/index.js').OntologyNode[],
    properties: Map<string, Property>,
    options: { patterns?: boolean } = {}
): void {
    if (options.patterns === false) return;

    const locationMatch = LOCATION_PATTERNS.find(p => p.regex.test(text));
    if (locationMatch) {
        const location = text.match(locationMatch.regex)![0].replace(locationMatch.prefix, '').trim();
        addProperty(properties, 'location', 'is near', location);
    }
}

/**
 * Extract intent properties from text
 */
export function extractIntents(
    text: string,
    properties: Map<string, Property>,
    options: { intents?: boolean } = {}
): void {
    if (options.intents === false) return;

    for (const intent of INTENTS) {
        if (intent.regex.test(text)) {
            addProperty(properties, 'intent', 'is', intent.key);
        }
    }
}

/**
 * Extract communication channel properties (email, phone, etc.)
 */
export function extractCommunication(
    text: string,
    ontology: import('../types/index.js').OntologyNode[],
    properties: Map<string, Property>,
    options: { patterns?: boolean } = {}
): void {
    if (options.patterns === false) return;

    const ontologyService = new OntologyService(ontology);

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
}

/**
 * Options for running a full deterministic extraction
 */
export interface DeterministicExtractionOptions {
    intents?: boolean;
    patterns?: boolean;
    ontologyKeys?: boolean;
    dates?: boolean;
    price?: boolean;
    roles?: boolean;
    ranges?: boolean;
}

/**
 * Run all deterministic extractions in one pass
 * This is the consolidated extraction used by both stages
 */
export function runDeterministicExtraction(
    text: string,
    ontology: import('../types/index.js').OntologyNode[],
    options: DeterministicExtractionOptions = {}
): Property[] {
    const properties = new Map<string, Property>();
    const lowerText = text.toLowerCase();

    extractIntents(text, properties, options);
    extractCommunication(text, ontology, properties, options);
    extractLocations(text, ontology, properties, options);
    extractDates(text, lowerText, properties, options);
    extractPrices(text, properties, options);
    extractRoles(text, properties, options);

    return getProperties(properties);
}

/**
 * Create a property extractor for a specific key/operator/value
 */
export function createPropertyExtractor(
    key: string,
    operator: string,
    valueExtractor: (match: RegExpMatchArray) => string
) {
    return (text: string, regex: RegExp, properties: Map<string, Property>) => {
        const match = text.match(regex);
        if (match) {
            addProperty(properties, key, operator, valueExtractor(match));
        }
    };
}