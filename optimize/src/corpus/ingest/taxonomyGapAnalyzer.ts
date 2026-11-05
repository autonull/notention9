import type { ExtractedTerm } from './types.js';

/**
 * Identify taxonomy gaps from corpus terms
 */
export function identifyTaxonomyGaps(terms: ExtractedTerm[]): string[] {
    const gaps: string[] = [];
    const categories = new Set(terms.map(t => t.category).filter(Boolean) as string[]);

    // Check for taxonomy axes coverage
    const taxonomyAxes = {
        socialForm: ['communal', 'authority', 'equality', 'market'],
        topology: ['1:1', '1:N', 'N:M', 'chain', 'coalition', 'hierarchy', 'mesh'],
        exchange: ['goods', 'labour', 'knowledge', 'capital', 'care', 'space', 'access', 'commitment', 'status', 'identity'],
        stakes: ['info', 'social', 'economic', 'legal', 'safety', 'existential'],
        temporality: ['one-shot', 'recurring', 'open-ended', 'deadline', 'ephemeral', 'generational'],
        heterogeneity: ['shared', 'cross-domain', 'multilingual', 'tacit', 'contested'],
    };

    // Check if corpus terms suggest missing taxonomy values
    const termText = terms.map(t => t.term).join(' ').toLowerCase();

    if (termText.includes('care') || termText.includes('family') || termText.includes('friend')) {
        if (!termText.includes('market')) {
            gaps.push('Care/kinship scenarios missing - taxonomy currently only covers market exchange');
        }
    }

    if (termText.includes('mentor') || termText.includes('apprentice') || termText.includes('learn')) {
        gaps.push('Mentorship/apprenticeship scenarios suggest authority-ranking or communal sharing axes');
    }

    if (termText.includes('open source') || termText.includes('community') || termText.includes('volunteer')) {
        gaps.push('Open source/community scenarios suggest communal sharing or generalized exchange');
    }

    if (termText.includes('legal') || termText.includes('contract') || termText.includes('compliance')) {
        gaps.push('Legal/contract scenarios suggest legal stakes and codified formality');
    }

    if (termText.includes('crisis') || termText.includes('emergency') || termText.includes('urgent')) {
        gaps.push('Crisis/emergency scenarios suggest safety stakes and ephemeral temporality');
    }

    if (termText.includes('long-term') || termText.includes('career') || termText.includes('lifetime')) {
        gaps.push('Long-term scenarios suggest generational temporality and existential stakes');
    }

    return gaps;
}