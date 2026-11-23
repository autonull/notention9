import type {RegisteredAction} from '@notention/core/ui/actionRegistry';

/** First letters of each word, e.g. "Open Settings" → "os". */
export function wordInitials(text: string): string {
    return text.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(word => word[0].toLowerCase()).join('');
}

/**
 * Predictable relevance: contiguous label match, then acronym, then tag,
 * then body text. Scattered-letter matches are too noisy for a result list.
 */
export function scoreMatch(query: string, action: RegisteredAction): number | null {
    const base = action.priority ?? 0;
    if (!query.trim()) return base;

    const q = query.trim().toLowerCase();
    const label = action.label.toLowerCase();
    const description = (action.description ?? '').toLowerCase();
    const tags = (action.tags ?? []).map(tag => tag.toLowerCase());

    if (label.startsWith(q)) return 3000 + base;
    if (label.includes(q)) return 2000 + base;
    if (wordInitials(action.label).startsWith(q)) return 1500 + base;
    if (q.startsWith('#') && tags.includes(q.slice(1))) return 1400 + base;
    if (tags.includes(q)) return 1300 + base;
    if (description.includes(q)) return 1000 + base;
    if (tags.some(tag => tag.startsWith(q))) return 900 + base;
    return null;
}
