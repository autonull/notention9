/**
 * Text processing utilities for corpus ingestion
 */

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
    'mine', 'yours', 'hers', 'ours', 'theirs', 'what', 'which', 'who', 'whom', 'whose',
    'where', 'when', 'why', 'how', 'all', 'each', 'every', 'some', 'any', 'no', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now', 'then', 'here',
    'there', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'once',
]);

export function isStopWord(word: string): boolean {
    return STOP_WORDS.has(word.toLowerCase());
}

export function extractTerms(text: string, minLength: number): string[] {
    const words = text
        .toLowerCase()
        .replace(/[^\w\s'-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= minLength)
        .filter(w => !isStopWord(w))
        .filter(w => !/^\d+$/.test(w))
        .filter(w => /^[a-z]/.test(w));

    return [...new Set(words)];
}

export function extractPhrases(text: string, maxWords: number = 3): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const phrases: string[] = [];

    for (const sentence of sentences) {
        const words = sentence
            .toLowerCase()
            .replace(/[^\w\s'-]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 2 && !isStopWord(w));

        for (let i = 0; i < words.length; i++) {
            for (let len = 2; len <= maxWords && i + len <= words.length; len++) {
                const phrase = words.slice(i, i + len).join(' ');
                if (phrase.length >= 5) {
                    phrases.push(phrase);
                }
            }
        }
    }

    return [...new Set(phrases)];
}

export function extractContext(text: string, term: string, window: number = 50): string[] {
    const contexts: string[] = [];
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    let index = 0;

    while ((index = lowerText.indexOf(lowerTerm, index)) !== -1) {
        const start = Math.max(0, index - window);
        const end = Math.min(text.length, index + term.length + window);
        const context = text.slice(start, end).trim();
        if (context.length > 10) {
            contexts.push(context);
        }
        index += term.length;
        if (contexts.length >= 3) break;
    }

    return contexts;
}