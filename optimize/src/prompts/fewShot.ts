/**
 * Few-shot retrieval: pick labelled cases similar to the input so the model
 * sees the key vocabulary and value style the corpus uses.
 * 
 * v2 adds:
 * - BM25 scoring (replaces token-cosine)
 * - Key-coverage scoring (prefers examples covering ontology keys the input likely needs)
 * - Deterministic tie-breaks preserved
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

/**
 * BM25 scoring - standard information retrieval ranking function.
 * Uses k1=1.2, b=0.75 (standard defaults).
 * Deterministic and dependency-free.
 */
export function bm25Score(
    queryTokens: string[],
    docTokens: string[],
    avgDocLen: number,
    k1 = 1.2,
    b = 0.75
): number {
    if (queryTokens.length === 0 || docTokens.length === 0) return 0;

    // Term frequency in document
    const tf = new Map<string, number>();
    for (const token of docTokens) {
        tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    const docLen = docTokens.length;
    let score = 0;

    for (const token of queryTokens) {
        const freq = tf.get(token) ?? 0;
        if (freq === 0) continue;

        // IDF: log((N - df + 0.5) / (df + 0.5))
        // For simplicity, we use a fixed IDF approximation based on term rarity
        // In practice, df would be precomputed from the corpus
        const idf = Math.log(1 + 1 / (freq + 0.5));

        // BM25 formula
        const numerator = freq * (k1 + 1);
        const denominator = freq + k1 * (1 - b + b * (docLen / avgDocLen));
        score += idf * (numerator / denominator);
    }

    return score;
}

/** Cosine similarity over binary token sets; kept for fallback/compatibility. */
function cosineSimilarity(queryTokens: Set<string>, caseTokens: Set<string>): number {
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
 * Ontology keys that can appear in extracted properties.
 * Derived from DEFAULT_ONTOLOGY attributes across all domains.
 */
export const ONTOLOGY_KEYS = [
    // Commerce
    'title', 'price', 'condition', 'category', 'brand', 'sku', 'stock', 'purchasePrice', 'priceRate',
    // Request
    'role', 'budget', 'schedule', 'frequency', 'urgency', 'location', 'format', 'audience',
    'student', 'vehicle', 'instrument', 'material', 'license', 'certification',
    // Event
    'eventTitle', 'date', 'time', 'venue', 'capacity', 'organizer', 'recurrence',
    // Work
    'jobTitle', 'company', 'salary', 'employmentType', 'experience', 'skills', 'remote',
    // Communication
    'contact', 'channel', 'message', 'thread',
    // Entity
    'name', 'type', 'description', 'address', 'phone', 'email', 'website',
    // Note/Commitment
    'status', 'deadline', 'commitment', 'priority', 'entityName', 'entityType',
    'committedAt', 'expectedCompletion', 'relatedNoteIds',
];

// Keyword hints to predict which ontology keys an input likely needs
const KEY_HINTS: Record<string, string[]> = {
    budget: ['budget', 'price', 'cost', 'pay', 'paying', 'afford', 'expensive', 'cheap', 'dollars', 'usd', '$'],
    price: ['price', 'cost', 'pay', 'paying', 'charge', 'rate', 'fee', 'dollars', 'usd', '$'],
    schedule: ['schedule', 'time', 'when', 'weekday', 'weekend', 'daily', 'weekly', 'monthly', 'hour', 'am', 'pm', 'o\'clock'],
    frequency: ['frequency', 'often', 'weekly', 'daily', 'monthly', 'twice', 'daily', 'recurring', 'every'],
    role: ['need', 'looking for', 'want', 'seeking', 'hire', 'help', 'someone', 'tutor', 'teacher', 'walker', 'driver', 'nanny', 'caregiver'],
    location: ['location', 'where', 'near', 'in ', 'at ', 'area', 'city', 'zip', 'address'],
    format: ['format', 'online', 'remote', 'in-person', 'virtual', 'video', 'call'],
    audience: ['audience', 'for', 'child', 'children', 'kid', 'adult', 'senior', 'elderly', 'student'],
    student: ['student', 'child', 'kid', 'my child', 'son', 'daughter', 'grade', 'school'],
    vehicle: ['vehicle', 'car', 'truck', 'van', 'bike', 'motorcycle', 'license'],
    instrument: ['instrument', 'piano', 'guitar', 'violin', 'drums', 'flute', 'music'],
    material: ['material', 'wood', 'metal', 'plastic', 'fabric', 'supplies'],
    condition: ['condition', 'new', 'used', 'refurbished', 'like-new'],
    category: ['category', 'type', 'kind', 'genre'],
    brand: ['brand', 'make', 'model'],
    urgency: ['urgent', 'asap', 'immediately', 'soon', 'emergency', 'deadline', 'before', 'by '],
    deadline: ['deadline', 'before', 'by ', 'due', 'friday', 'monday', 'end of', 'until'],
    capacity: ['capacity', 'people', 'person', 'group', 'team', 'seats'],
    experience: ['experience', 'years', 'expert', 'beginner', 'senior', 'junior'],
    skills: ['skills', 'skill', 'knows', 'proficient', 'certified'],
    remote: ['remote', 'online', 'virtual', 'work from home', 'wfh'],
    // Commerce specific
    stock: ['stock', 'inventory', 'available', 'in stock'],
    purchasePrice: ['purchase price', 'wholesale', 'cost price', 'buy for'],
    priceRate: ['rate', 'per hour', 'hourly', '/hr', '/hour', 'daily rate'],
    // Event specific
    eventTitle: ['event', 'meeting', 'conference', 'workshop', 'party', 'gathering'],
    date: ['date', 'on ', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
    venue: ['venue', 'place', 'location', 'room', 'hall', 'center'],
    organizer: ['organizer', 'host', 'hosted by'],
    recurrence: ['recurring', 'weekly', 'monthly', 'every week', 'every month'],
    // Work specific
    jobTitle: ['job', 'position', 'role', 'title', 'hiring', 'career'],
    company: ['company', 'employer', 'organization', 'firm'],
    salary: ['salary', 'compensation', 'pay', 'wage', 'income'],
    employmentType: ['full-time', 'part-time', 'contract', 'freelance', 'temporary', 'internship'],
    // Note/Commitment
    priority: ['priority', 'urgent', 'high priority', 'critical', 'low priority'],
    status: ['status', 'open', 'matched', 'committed', 'done', 'lapsed'],
};

/**
 * Predict which ontology keys are likely needed for a given input text.
 * Returns a Set of predicted keys.
 */
export function predictNeededKeys(text: string): Set<string> {
    const lower = text.toLowerCase();
    const predicted = new Set<string>();

    for (const [key, hints] of Object.entries(KEY_HINTS)) {
        for (const hint of hints) {
            if (lower.includes(hint)) {
                predicted.add(key);
                break;
            }
        }
    }

    return predicted;
}

/**
 * Calculate key-coverage score: how many predicted keys are covered by the candidate's expected properties.
 */
function keyCoverageScore(candidate: LabelledCase, predictedKeys: Set<string>): number {
    if (predictedKeys.size === 0) return 0;

    const candidateKeys = new Set(candidate.expected.map(p => p.key));
    let covered = 0;
    for (const key of predictedKeys) {
        if (candidateKeys.has(key)) covered++;
    }
    return covered / predictedKeys.size;
}

/**
 * Combined scoring: BM25 (70%) + Key-coverage (30%)
 * Deterministic tie-break by candidate id.
 */
interface ScoredCandidate {
    candidate: LabelledCase;
    bm25: number;
    keyCoverage: number;
    combined: number;
}

function computeAvgDocLen(bank: readonly LabelledCase[]): number {
    if (bank.length === 0) return 100;
    let total = 0;
    for (const c of bank) {
        total += tokenize(c.input).length;
    }
    return total / bank.length;
}

/**
 * Top-k labelled cases for `text`, using BM25 + key-coverage scoring.
 * Excludes the evaluated case itself and near-duplicates.
 * Deterministic ordering.
 */
export function selectFewShot(
    text: string,
    bank: readonly LabelledCase[],
    k = 3
): LabelledCase[] {
    const query = normalizeInput(text);
    const queryTokens = tokenize(text);
    const predictedKeys = predictNeededKeys(text);
    const avgDocLen = computeAvgDocLen(bank);

    const ranked = bank
        .filter(candidate => normalizeInput(candidate.input) !== query)
        .map(candidate => {
            const docTokens = tokenize(candidate.input);
            const bm25 = bm25Score(queryTokens, docTokens, avgDocLen);
            const keyCoverage = keyCoverageScore(candidate, predictedKeys);
            const combined = 0.7 * bm25 + 0.3 * keyCoverage;
            return { candidate, bm25, keyCoverage, combined };
        })
        .filter(entry => entry.combined > 0)
        .sort((a, b) =>
            b.combined - a.combined ||
            b.keyCoverage - a.keyCoverage ||
            b.bm25 - a.bm25 ||
            (a.candidate.id ?? '').localeCompare(b.candidate.id ?? '')
        );

    const selected: LabelledCase[] = [];
    const seenInputs = new Set<string>();
    const seenTokens: Set<string>[] = [];

    for (const { candidate } of ranked) {
        const input = normalizeInput(candidate.input);
        if (seenInputs.has(input)) continue;
        const tokens = new Set(tokenize(candidate.input));
        if (seenTokens.some(existing => cosineSimilarity(existing, tokens) > 0.9)) continue;
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
