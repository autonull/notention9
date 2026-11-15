/**
 * Few-shot retrieval: pick labelled cases similar to the input so the model
 * sees the key vocabulary and value style the corpus uses.
 */

import type { Property } from '@notention/core';

export interface LabelledCase {
    id?: string;
    input: string;
    expected: Property[];
}

const STOPWORDS = new Set([
    'a', 'an', 'and', 'are', 'at', 'be', 'by', 'for', 'from', 'i', 'in', 'is', 'it',
    'my', 'of', 'on', 'or', 'the', 'to', 'we', 'with', 'need', 'needs', 'looking',
    'want', 'someone', 'help', 'please', 'can', 'you', 'this', 'that', 'per',
]);

export function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9.@-]+/)
        .filter(token => token.length > 1 && !STOPWORDS.has(token));
}

/** Cosine similarity over binary token sets; deterministic and dependency-free. */
function similarity(queryTokens: Set<string>, caseTokens: Set<string>): number {
    if (queryTokens.size === 0 || caseTokens.size === 0) return 0;
    let shared = 0;
    for (const token of queryTokens) {
        if (caseTokens.has(token)) shared++;
    }
    return shared / Math.sqrt(queryTokens.size * caseTokens.size);
}

const normalizeInput = (input: string): string =>
    input.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Top-k labelled cases for `text`, excluding the evaluated case itself and
 * near-duplicates of already-selected examples.
 */
export function selectFewShot(
    text: string,
    bank: readonly LabelledCase[],
    k = 3
): LabelledCase[] {
    const query = normalizeInput(text);
    const queryTokens = new Set(tokenize(text));

    const ranked = bank
        .filter(candidate => normalizeInput(candidate.input) !== query)
        .map(candidate => ({
            candidate,
            score: similarity(queryTokens, new Set(tokenize(candidate.input))),
        }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || (a.candidate.id ?? '').localeCompare(b.candidate.id ?? ''));

    const selected: LabelledCase[] = [];
    const seenInputs = new Set<string>();
    const seenTokens: Set<string>[] = [];

    for (const { candidate, score } of ranked) {
        const input = normalizeInput(candidate.input);
        if (seenInputs.has(input)) continue;
        const tokens = new Set(tokenize(candidate.input));
        if (seenTokens.some(existing => similarity(existing, tokens) > 0.9)) continue;
        if (selected.length > 0 && score === 0) break;
        selected.push(candidate);
        seenInputs.add(input);
        seenTokens.push(tokens);
        if (selected.length === k) break;
    }

    return selected;
}

/** Render retrieved examples as a compact prompt prefix. */
export function renderFewShot(examples: readonly LabelledCase[]): string {
    if (examples.length === 0) return '';
    const lines = examples.map(example =>
        `"${example.input}" -> ${JSON.stringify(example.expected)}`
    );
    return `Similar labelled examples:\n${lines.join('\n')}\n\n`;
}
