/**
 * PII Redaction Utility
 * Detects and masks Personally Identifiable Information (email, phone, SSN)
 * before remote inference/transport.
 */

export type PIIKind = 'email' | 'phone' | 'ssn';

export interface PIIMatch {
    kind: PIIKind;
    original: string;
    redacted: string;
    start: number;
    end: number;
}

export interface RedactionResult {
    text: string;
    matches: PIIMatch[];
    hasRedactions: boolean;
}

// Email regex - RFC 5322 compliant (simplified for practical use)
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

// Phone regex - US formats: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, +1-xxx-xxx-xxxx, etc.
// Practical: area code 2-9, any exchange/subscriber, common separators
// Handles: (555) 123-4567, 555-123-4567, 555.123.4567, +1-555-123-4567, 5551234567
const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

// SSN regex - xxx-xx-xxxx or xxxxxxxxx
// Area number: 001-899 (not 000, 666, 900-999)
// Group number: 01-99 (not 00)
// Serial number: 0001-9999 (not 0000)
// Two patterns: with separators and without
const SSN_REGEX = new RegExp(
    '(?:\\b(?!000|666|9\\d{2})\\d{3}[-.\\s](?!00)\\d{2}[-.\\s](?!0000)\\d{4}\\b)' +
    '|' +
    '(?:\\b(?!000|666|9\\d{2})\\d{9}\\b)',
    'g'
);

/**
 * Default redaction masks for each PII kind
 */
export const DEFAULT_MASKS: Record<PIIKind, string> = {
    email: '[EMAIL]',
    phone: '[PHONE]',
    ssn: '[SSN]',
};

/**
 * Custom mask generators for each PII kind
 */
export const MASK_GENERATORS: Record<PIIKind, (match: string) => string> = {
    email: (match) => {
        const [local, domain] = match.split('@');
        const maskedLocal = local.length > 2
            ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
            : '*'.repeat(local.length);
        return `${maskedLocal}@${domain}`;
    },
    phone: () => DEFAULT_MASKS.phone,
    ssn: () => DEFAULT_MASKS.ssn,
};

/**
 * Detect all PII matches in text
 */
export function detectPII(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    // Detect emails
    for (const match of text.matchAll(EMAIL_REGEX)) {
        matches.push({
            kind: 'email',
            original: match[0],
            redacted: DEFAULT_MASKS.email,
            start: match.index ?? 0,
            end: (match.index ?? 0) + match[0].length,
        });
    }

    // Detect phones
    for (const match of text.matchAll(PHONE_REGEX)) {
        matches.push({
            kind: 'phone',
            original: match[0],
            redacted: DEFAULT_MASKS.phone,
            start: match.index ?? 0,
            end: (match.index ?? 0) + match[0].length,
        });
    }

    // Detect SSNs
    for (const match of text.matchAll(SSN_REGEX)) {
        matches.push({
            kind: 'ssn',
            original: match[0],
            redacted: DEFAULT_MASKS.ssn,
            start: match.index ?? 0,
            end: (match.index ?? 0) + match[0].length,
        });
    }

    // Sort by start position (descending for safe replacement)
    return matches.sort((a, b) => b.start - a.start);
}

/**
 * Redact PII in text
 * @param text - Input text
 * @param options - Redaction options
 * @returns RedactionResult with redacted text and match details
 */
export function redactPII(
    text: string,
    options: {
        customMasks?: Partial<Record<PIIKind, string>>;
        maskGenerators?: Partial<Record<PIIKind, (match: string) => string>>;
        kinds?: PIIKind[];
    } = {}
): RedactionResult {
    const { customMasks, maskGenerators, kinds = ['email', 'phone', 'ssn'] } = options;

    const matches = detectPII(text).filter(m => kinds.includes(m.kind));

    if (matches.length === 0) {
        return { text, matches: [], hasRedactions: false };
    }

    let redactedText = text;

    // Apply replacements in reverse order (matches already sorted by start descending)
    for (const match of matches) {
        let replacement = match.redacted; // Default: simple mask token
        if (customMasks?.[match.kind]) {
            replacement = customMasks[match.kind]!;
        } else if (maskGenerators?.[match.kind]) {
            replacement = maskGenerators[match.kind]!(match.original);
        }
        redactedText = redactedText.slice(0, match.start) + replacement + redactedText.slice(match.end);
    }

    return {
        text: redactedText,
        matches: matches.sort((a, b) => a.start - b.start),
        hasRedactions: true,
    };
}

/**
 * Redact PII with simple mask tokens (for remote transport)
 */
export function redactPIIForTransport(text: string, kinds?: PIIKind[]): string {
    return redactPII(text, {
        customMasks: {
            email: '[EMAIL]',
            phone: '[PHONE]',
            ssn: '[SSN]',
        },
        kinds,
    }).text;
}

/**
 * Check if text contains PII without redacting
 */
export function hasPII(text: string, kinds?: PIIKind[]): boolean {
    return detectPII(text).some(m => kinds ? kinds.includes(m.kind) : true);
}

/**
 * Get PII statistics for text
 */
export function getPIIStats(text: string): Record<PIIKind, number> {
    const matches = detectPII(text);
    const stats: Record<PIIKind, number> = { email: 0, phone: 0, ssn: 0 };
    for (const match of matches) {
        stats[match.kind]++;
    }
    return stats;
}