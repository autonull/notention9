/**
 * Request-slot extraction — captures the structure of a stated need.
 *
 * The capture flow's core loop is "I need X, when Y, for Z". The slot names
 * below match the intent-case contract consumed by the E2 capture experiment
 * (`need`, `schedule`, `frequency`, `deadline`, `budget`, `price`).
 */

import type { Property } from '../types/index.js';
import { addProperty } from './propertyUtils.js';

/** Words that terminate a need phrase. */
const NEED_TERMINATORS = [
    'for', 'in', 'on', 'at', 'by', 'near', 'starting', 'before', 'after', 'that', 'who',
    'with', 'budget', 'around', 'plus', 'and', 'but', 'so', 'when', 'while', 'next', 'this',
    'biweekly', 'weekly', 'daily', 'monthly', 'yearly', 'annually', 'twice', 'night',
    'morning', 'afternoon', 'evening', 'weekend', 'weekday', 'outdoor', 'indoor',
].join('|');

const NEED_BOUNDARY = `(?=\\s+(?:${NEED_TERMINATORS})\\b|[,.;!?]|$)`;

const NEED_PATTERNS: RegExp[] = [
    new RegExp(`\\bneed\\s+to\\s+(.+?)${NEED_BOUNDARY}`, 'i'),
    new RegExp(`\\bwant\\s+to\\s+(.+?)${NEED_BOUNDARY}`, 'i'),
    new RegExp(`\\bneed(?:s)?\\s+(?:an?\\s+|someone\\s+to\\s+|some(?:where|place)\\s+to\\s+)?(.+?)${NEED_BOUNDARY}`, 'i'),
    new RegExp(`\\blooking\\s+for\\s+(?:an?\\s+)?(.+?)${NEED_BOUNDARY}`, 'i'),
    new RegExp(`\\bseeking\\s+(?:an?\\s+)?(.+?)${NEED_BOUNDARY}`, 'i'),
    new RegExp(`\\bhiring\\s+(?:an?\\s+)?(.+?)${NEED_BOUNDARY}`, 'i'),
    new RegExp(`\\b(?:offering|providing)\\s+(?:an?\\s+)?(.+?)${NEED_BOUNDARY}`, 'i'),
];

const DAY = '(?:mon|tues|wednes|thurs|fri|satur|sun)days?';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const SCHEDULE_PATTERN = new RegExp(
    `\\b(?:next|this|on)?\\s*${DAY}(?:\\s*(?:,|and|&)\\s*${DAY})*` +
    `(?:\\s+(?:night|mornings?|afternoons?|evenings?|weekends?|weekdays?))?` +
    `(?:\\s+\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?(?:\\s*[-–]\\s*\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)?)?`,
    'i'
);

const FREQUENCY_PATTERN = /\b(?:biweekly|twice\s+(?:a|per)\s+week|nightly|weekly|daily|monthly|yearly|annually|every\s+(?:day|week|month|year|weekday|weekend))\b/i;

const BUDGET_PATTERN = /\bbudget(?:\s+of)?\s*[:=]?\s*([$€£]?\s*\d+(?:,\d{3})*(?:\.\d+)?)/i;
const PAYING_PATTERN = /\b(?:paying|pay|rate\s+of|charging)\s*([$€£]?\s*\d+(?:,\d{3})*(?:\.\d+)?)/i;
const FREE_PATTERN = /\b(?:free|at\s+no\s+cost|no\s+charge)\b/i;

const DEADLINE_PATTERN = /\bby\s+(?:the\s+)?end\s+of\s+(?:the\s+)?(month|week|year)\b/i;
const DEADLINE_WEEKDAY_PATTERN = new RegExp(`\\b(?:by|before|this|next)\\s+(?:next\\s+|this\\s+)?(?<day>${DAY})\\b`, 'i');
const DEADLINE_MONTH_PATTERN = /\bby\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
const DEADLINE_TIME_PATTERN = /\bby\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;

/**
 * End of a bounded period: end of the current month, a week out, or end of the
 * current year.
 */
function endOfPeriod(period: string, from: Date): Date {
    const date = new Date(from);
    if (period === 'month') {
        date.setMonth(date.getMonth() + 1, 0);
    } else if (period === 'year') {
        date.setFullYear(date.getFullYear() + 1, 0, 0);
    } else {
        date.setDate(date.getDate() + 7);
    }
    return date;
}

function nextWeekday(from: Date, weekday: string): Date {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const target = days.findIndex(day => weekday.toLowerCase().startsWith(day.slice(0, 3)));
    if (target < 0) return from;
    const date = new Date(from);
    const delta = (target - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + delta);
    return date;
}

export interface RequestSlotOptions {
    request?: boolean;
}

/**
 * Extract the request slots of a capture into the property map.
 */
export function extractRequestSlots(
    text: string,
    properties: Map<string, Property>,
    options: RequestSlotOptions = {},
    confidence = 0.9,
    provenance: Property['provenance'] = 'deterministic'
): void {
    if (options.request === false) return;

    for (const pattern of NEED_PATTERNS) {
        const match = text.match(pattern);
        const value = match?.[1]?.trim();
        if (value && value.length > 1 && value.length < 80) {
            addProperty(properties, 'need', 'contains', value, confidence, provenance);
            break;
        }
    }

    const scheduleMatch = text.match(SCHEDULE_PATTERN);
    if (scheduleMatch) {
        addProperty(properties, 'schedule', 'is', scheduleMatch[0].trim(), confidence, provenance);
    }

    const frequencyMatch = text.match(FREQUENCY_PATTERN);
    if (frequencyMatch) {
        addProperty(properties, 'frequency', 'is', frequencyMatch[0].trim().toLowerCase(), confidence, provenance);
    }

    const budgetMatch = text.match(BUDGET_PATTERN) ?? text.match(PAYING_PATTERN);
    if (budgetMatch) {
        const amount = budgetMatch[1].replace(/[^\d.,]/g, '');
        if (amount) addProperty(properties, 'budget', 'is', amount, confidence, provenance);
    }

    if (FREE_PATTERN.test(text)) {
        addProperty(properties, 'price', 'is', 'free', confidence, provenance);
    }

    const deadline = resolveDeadline(text);
    if (deadline) {
        addProperty(properties, 'deadline', 'is', deadline, confidence, provenance);
    }
}

/**
 * Resolve the deadline of a request: end of a period, a named date, a weekday,
 * or a time of day.
 */
function resolveDeadline(text: string): string | null {
    const periodMatch = text.match(DEADLINE_PATTERN);
    if (periodMatch) {
        return endOfPeriod(periodMatch[1].toLowerCase(), new Date()).toISOString().split('T')[0];
    }

    const monthMatch = text.match(DEADLINE_MONTH_PATTERN);
    if (monthMatch) {
        const date = new Date();
        date.setMonth(MONTHS.indexOf(monthMatch[1].toLowerCase()), parseInt(monthMatch[2], 10));
        if (date < new Date()) date.setFullYear(date.getFullYear() + 1);
        return date.toISOString().split('T')[0];
    }

    const weekdayMatch = text.match(DEADLINE_WEEKDAY_PATTERN);
    if (weekdayMatch?.groups?.day) {
        return nextWeekday(new Date(), weekdayMatch.groups.day).toISOString().split('T')[0];
    }

    const timeMatch = text.match(DEADLINE_TIME_PATTERN);
    if (timeMatch) {
        const date = new Date();
        const hours = parseInt(timeMatch[1], 10) % 12 + (timeMatch[3].toLowerCase() === 'pm' ? 12 : 0);
        date.setHours(hours, parseInt(timeMatch[2] ?? '0', 10), 0, 0);
        if (date < new Date()) date.setDate(date.getDate() + 1);
        return date.toISOString().split('T')[0];
    }

    return null;
}
