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
import { extractRequestSlots } from './requestSlots.js';
import { DEFAULT_DETERMINISTIC_CONFIDENCE } from '../telemetry/constants.js';

/**
 * Extract date-related properties from text
 * Shared between DeterministicStage and PatternStage
 */
export function extractDates(
    text: string,
    lowerText: string,
    properties: Map<string, Property>,
    options: { dates?: boolean } = {},
    confidence = DEFAULT_DETERMINISTIC_CONFIDENCE,
    provenance: Property['provenance'] = 'deterministic'
): void {
    if (options.dates === false) return;

    const today = new Date();

    // Simple relative dates
    if (lowerText.includes('due tomorrow') || lowerText.includes('deadline tomorrow')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        addProperty(properties, 'deadline', 'is', tomorrow.toISOString().split('T')[0], confidence, provenance);
    }
    if (lowerText.includes('due today') || lowerText.includes('deadline today')) {
        addProperty(properties, 'deadline', 'is', today.toISOString().split('T')[0], confidence, provenance);
    }
    if (lowerText.includes('next week')) {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        addProperty(properties, 'deadline', 'is', nextWeek.toISOString().split('T')[0], confidence, provenance);
    }
    const inDaysMatch = lowerText.match(/(?:in|within) (\d+) days/);
    if (inDaysMatch) {
        const future = new Date(today);
        future.setDate(future.getDate() + parseInt(inDaysMatch[1]));
        addProperty(properties, 'deadline', 'is', future.toISOString().split('T')[0], confidence, provenance);
    }

    // DATE_PATTERNS from patterns.ts (used by DeterministicStage)
    const datePattern = DATE_PATTERNS.find(p => p.regex.test(text));
    if (datePattern) {
        const date = new Date();
        date.setDate(date.getDate() + datePattern.offset);
        addProperty(properties, 'date', 'is', date.toISOString().split('T')[0], confidence, provenance);
    }
}

/**
 * Extract price/cost properties from text
 * Shared between DeterministicStage and PatternStage
 */
export function extractPrices(
    text: string,
    properties: Map<string, Property>,
    options: { price?: boolean; ranges?: boolean } = {},
    confidence = DEFAULT_DETERMINISTIC_CONFIDENCE,
    provenance: Property['provenance'] = 'deterministic'
): void {
    if (options.price === false) return;

    // Price ranges come first — a range is more specific than its endpoints.
    // An explicit currency or the word "between" is required so that time
    // ranges ("4-6pm") are never read as money.
    let hasRange = false;
    if (options.ranges !== false) {
        const currencyRange = text.match(/(?:\$|€|£)\s*\d+(?:,\d{3})*(?:\.\d+)?\s*(?:and|to|-)\s*(?:\$|€|£)?\s*\d+(?:,\d{3})*(?:\.\d+)?/);
        const wordRange = text.match(/\bbetween\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s+and\s+(\d+(?:,\d{3})*(?:\.\d+)?)/i);
        const [min, max] = currencyRange
            ? [currencyRange[0].match(/\d+(?:,\d{3})*(?:\.\d+)?/)?.[0], currencyRange[0].match(/\d+(?:,\d{3})*(?:\.\d+)?$/)?.[0]]
            : [wordRange?.[1], wordRange?.[2]];
        if (min && max && Number(max.replace(/,/g, '')) > Number(min.replace(/,/g, ''))) {
            addProperty(properties, 'price', 'between', `${min},${max}`, confidence, provenance);
            hasRange = true;
        }
    }

    // Comparative prices (under/over)
    const lessThanMatch = text.match(/(?:under|below|less than)\s*([$€£])?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(usd|eur|gbp|sats))?/i);
    if (lessThanMatch) {
        const symbol = lessThanMatch[1] || '';
        const suffix = lessThanMatch[3] || '';
        const quantity = parseQuantity(`${symbol}${lessThanMatch[2]} ${suffix}`.trim());
        addProperty(properties, 'price', 'less than', quantity ? `${quantity.value} ${quantity.unit}` : lessThanMatch[2], confidence, provenance);
    }

    const greaterThanMatch = text.match(/(?:over|above|more than)\s*([$€£])?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(usd|eur|gbp|sats))?/i);
    if (greaterThanMatch) {
        const symbol = greaterThanMatch[1] || '';
        const suffix = greaterThanMatch[3] || '';
        const quantity = parseQuantity(`${symbol}${greaterThanMatch[2]} ${suffix}`.trim());
        addProperty(properties, 'price', 'greater than', quantity ? `${quantity.value} ${quantity.unit}` : greaterThanMatch[2], confidence, provenance);
    }

    // Exact prices (if no comparative or range match)
    if (!lessThanMatch && !greaterThanMatch && !hasRange) {
        const priceMatch = text.match(/([$€£])\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);
        if (priceMatch) {
            const quantity = parseQuantity(`${priceMatch[1]}${priceMatch[2]}`);
            addProperty(properties, 'price', 'is', quantity ? `${quantity.value} ${quantity.unit}` : priceMatch[2], confidence, provenance);
        } else {
            const currencyMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(USD|EUR|GBP|sats)/i);
            if (currencyMatch) {
                const quantity = parseQuantity(`${currencyMatch[1]} ${currencyMatch[2]}`);
                addProperty(properties, 'price', 'is', quantity ? `${quantity.value} ${quantity.unit}` : currencyMatch[1], confidence, provenance);
            }
        }
    }

    // Budget regex (from DeterministicStage)
    const budgetMatch = text.match(REGEX.BUDGET);
    if (budgetMatch) {
        const amount = (budgetMatch[1] || budgetMatch[2]).replace(/,/g, '');
        addProperty(properties, 'budget', 'is', amount, confidence, provenance);
    }
}

/**
 * Extract role properties from text
 */
export function extractRoles(
    text: string,
    properties: Map<string, Property>,
    options: { roles?: boolean } = {},
    confidence = DEFAULT_DETERMINISTIC_CONFIDENCE,
    provenance: Property['provenance'] = 'deterministic'
): void {
    if (options.roles === false) return;

    const roleRequestMatch = text.match(/(?:looking for|hiring|need) (?:a|an)\s+([a-zA-Z\s]+?)(?=(?:[\.,]|\s+(?:for|in|to|with)|$))/i);
    if (roleRequestMatch) {
        const role = roleRequestMatch[1].trim();
        if (role.split(' ').length < 5) addProperty(properties, 'role', 'contains', role, confidence, provenance);
    }

    const roleOfferMatch = text.match(/i am (?:a|an)\s+([a-zA-Z\s]+?)(?=(?:[\.,]|\s+(?:who|with|looking|in|for)|$))/i);
    if (roleOfferMatch) {
        const role = roleOfferMatch[1].trim();
        if (role.split(' ').length < 5) addProperty(properties, 'role', 'is', role, confidence, provenance);
    }
}

/**
 * Extract location properties from text
 */
export function extractLocations(
    text: string,
    ontology: import('../types/index.js').OntologyNode[],
    properties: Map<string, Property>,
    options: { patterns?: boolean } = {},
    confidence = DEFAULT_DETERMINISTIC_CONFIDENCE,
    provenance: Property['provenance'] = 'deterministic'
): void {
    if (options.patterns === false) return;

    const locationMatch = LOCATION_PATTERNS.find(p => p.regex.test(text));
    if (locationMatch) {
        const location = text.match(locationMatch.regex)![0].replace(locationMatch.prefix, '').trim();
        addProperty(properties, 'location', 'is near', location, confidence, provenance);
    }
}

/**
 * Extract intent properties from text
 */
export function extractIntents(
    text: string,
    properties: Map<string, Property>,
    options: { intents?: boolean } = {},
    confidence = DEFAULT_DETERMINISTIC_CONFIDENCE,
    provenance: Property['provenance'] = 'deterministic'
): void {
    if (options.intents === false) return;

    for (const intent of INTENTS) {
        if (intent.regex.test(text)) {
            addProperty(properties, 'intent', 'is', intent.key, confidence, provenance);
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
    options: { patterns?: boolean } = {},
    confidence = DEFAULT_DETERMINISTIC_CONFIDENCE,
    provenance: Property['provenance'] = 'deterministic'
): void {
    if (options.patterns === false) return;

    const ontologyService = new OntologyService(ontology);

    const sendToMatch = text.match(CORE_PATTERNS.SEND_TO);
    if (sendToMatch) addProperty(properties, 'to', 'send to', sendToMatch[1], confidence, provenance);

    const channelMatch = text.match(CORE_PATTERNS.CHANNEL);
    if (channelMatch) {
        const channel = channelMatch[1].toLowerCase();
        if (ontologyService.getEnumOptions('channel')?.includes(channel)) {
            addProperty(properties, 'channel', 'is', channel, confidence, provenance);
        }
    }

    const phoneMatch = text.match(REGEX.PHONE);
    if (phoneMatch && !hasProperty(properties, 'to', 'send to') && !hasProperty(properties, 'from', 'is')) {
        addProperty(properties, 'from', 'is', phoneMatch[1], confidence, provenance);
    }

    const emailMatch = text.match(REGEX.EMAIL);
    if (emailMatch) addProperty(properties, 'email', 'is', emailMatch[0], confidence, provenance);
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
    request?: boolean;
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

    extractIntents(text, properties, options, 0.95, 'deterministic');
    extractCommunication(text, ontology, properties, options, 0.95, 'deterministic');
    extractLocations(text, ontology, properties, options, 0.95, 'deterministic');
    extractDates(text, lowerText, properties, options, 0.95, 'deterministic');
    extractPrices(text, properties, options, 0.95, 'deterministic');
    extractRoles(text, properties, options, 0.95, 'deterministic');
    extractRequestSlots(text, properties, options, 0.95, 'deterministic');

    return getProperties(properties);
}

/**
 * Create a property extractor for a specific key/operator/value
 */
export function createPropertyExtractor(
    key: string,
    operator: string,
    valueExtractor: (match: RegExpMatchArray) => string,
    confidence = 0.95,
    provenance: Property['provenance'] = 'deterministic'
) {
    return (text: string, regex: RegExp, properties: Map<string, Property>) => {
        const match = text.match(regex);
        if (match) {
            addProperty(properties, key, operator, valueExtractor(match), confidence, provenance);
        }
    };
}