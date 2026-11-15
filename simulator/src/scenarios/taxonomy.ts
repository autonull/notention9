/**
 * Taxonomy annotation for simulator scenarios.
 *
 * Every domain scenario declares its cell on the Fiske/Ostrom taxonomy axes.
 * Coverage is computed from these annotations instead of hand-maintained counts,
 * so `pnpm taxonomy:coverage` and `data/loop/taxonomy.json` stay in sync.
 */

export const TAXONOMY_AXES = {
    socialForm: ['communal', 'authority', 'equality', 'market'],
    topology: ['1:1', '1:N', 'N:M', 'chain', 'coalition', 'hierarchy', 'mesh'],
    exchange: ['goods', 'labour', 'knowledge', 'capital', 'care', 'space', 'access', 'commitment', 'status', 'identity'],
    stakes: ['info', 'social', 'economic', 'legal', 'safety', 'existential'],
    temporality: ['one-shot', 'recurring', 'open-ended', 'deadline', 'ephemeral', 'generational'],
    heterogeneity: ['shared', 'cross-domain', 'multilingual', 'tacit', 'contested'],
} as const;

export type TaxonomyAxis = keyof typeof TAXONOMY_AXES;
export type TaxonomyCell = { [Axis in TaxonomyAxis]: (typeof TAXONOMY_AXES)[Axis][number] };

/** Coarse cell = the (socialForm, stakes) pair used for the 4x6 = 24 coverage matrix. */
export const COARSE_AXES = ['socialForm', 'stakes'] as const satisfies readonly TaxonomyAxis[];
export const TOTAL_COARSE_CELLS =
    TAXONOMY_AXES[COARSE_AXES[0]].length * TAXONOMY_AXES[COARSE_AXES[1]].length;

export const SCENARIO_TAXONOMY: Record<string, TaxonomyCell> = {
    'freelance-marketplace': { socialForm: 'market', topology: 'N:M', exchange: 'labour', stakes: 'economic', temporality: 'one-shot', heterogeneity: 'shared' },
    'hiring-pipeline': { socialForm: 'market', topology: 'N:M', exchange: 'labour', stakes: 'economic', temporality: 'one-shot', heterogeneity: 'shared' },
    'project-collaboration': { socialForm: 'equality', topology: 'N:M', exchange: 'labour', stakes: 'economic', temporality: 'recurring', heterogeneity: 'shared' },
    'mentorship-network': { socialForm: 'equality', topology: 'N:M', exchange: 'knowledge', stakes: 'economic', temporality: 'recurring', heterogeneity: 'shared' },
    'learning-community': { socialForm: 'communal', topology: 'N:M', exchange: 'knowledge', stakes: 'economic', temporality: 'open-ended', heterogeneity: 'shared' },
    'cofounder-matching': { socialForm: 'authority', topology: '1:N', exchange: 'capital', stakes: 'economic', temporality: 'deadline', heterogeneity: 'shared' },
    'investor-startup': { socialForm: 'market', topology: '1:N', exchange: 'capital', stakes: 'economic', temporality: 'one-shot', heterogeneity: 'shared' },
    'events-networking': { socialForm: 'market', topology: 'N:M', exchange: 'status', stakes: 'social', temporality: 'ephemeral', heterogeneity: 'shared' },
    'open-source-contrib': { socialForm: 'communal', topology: 'mesh', exchange: 'labour', stakes: 'social', temporality: 'open-ended', heterogeneity: 'shared' },
    'research-collaboration': { socialForm: 'equality', topology: 'N:M', exchange: 'knowledge', stakes: 'social', temporality: 'open-ended', heterogeneity: 'shared' },
    'legal-contract': { socialForm: 'market', topology: 'N:M', exchange: 'commitment', stakes: 'legal', temporality: 'one-shot', heterogeneity: 'shared' },
    'crisis-response': { socialForm: 'communal', topology: 'mesh', exchange: 'care', stakes: 'safety', temporality: 'ephemeral', heterogeneity: 'shared' },
    'generational-stewardship': { socialForm: 'communal', topology: 'coalition', exchange: 'care', stakes: 'existential', temporality: 'generational', heterogeneity: 'shared' },
    'kinship-care': { socialForm: 'communal', topology: 'coalition', exchange: 'care', stakes: 'existential', temporality: 'generational', heterogeneity: 'shared' },
    'commons-governance': { socialForm: 'communal', topology: 'coalition', exchange: 'goods', stakes: 'economic', temporality: 'recurring', heterogeneity: 'shared' },
    'cross-cultural': { socialForm: 'communal', topology: 'mesh', exchange: 'care', stakes: 'safety', temporality: 'ephemeral', heterogeneity: 'multilingual' },
    'long-term-commitment': { socialForm: 'equality', topology: 'chain', exchange: 'commitment', stakes: 'economic', temporality: 'open-ended', heterogeneity: 'shared' },
    'government-services': { socialForm: 'authority', topology: 'hierarchy', exchange: 'access', stakes: 'legal', temporality: 'deadline', heterogeneity: 'shared' },
    'labor-dispute': { socialForm: 'equality', topology: 'coalition', exchange: 'commitment', stakes: 'economic', temporality: 'deadline', heterogeneity: 'contested' },
    'decentralized-identity': { socialForm: 'market', topology: 'mesh', exchange: 'identity', stakes: 'social', temporality: 'open-ended', heterogeneity: 'shared' },
    'contested-resources': { socialForm: 'communal', topology: 'mesh', exchange: 'space', stakes: 'economic', temporality: 'recurring', heterogeneity: 'contested' },
    'referral-network': { socialForm: 'equality', topology: 'chain', exchange: 'commitment', stakes: 'economic', temporality: 'open-ended', heterogeneity: 'shared' },
};

export interface CoverageReport {
    scenarioCount: number;
    /** Distinct full six-axis cells. */
    fineCellCount: number;
    /** Distinct (socialForm, stakes) pairs. */
    coarseCovered: string[];
    coarseUncovered: string[];
    coarseTotal: number;
}

const coarseKey = (cell: TaxonomyCell) => COARSE_AXES.map(axis => cell[axis]).join('/');

export function computeCoverage(
    annotations: Record<string, TaxonomyCell> = SCENARIO_TAXONOMY
): CoverageReport {
    const cells = Object.values(annotations);
    const fine = new Set(cells.map(cell => Object.values(cell).join('/')));
    const covered = new Set(cells.map(coarseKey));
    const [firstAxis, secondAxis] = COARSE_AXES;
    const all = TAXONOMY_AXES[firstAxis].flatMap(first =>
        TAXONOMY_AXES[secondAxis].map(second => `${first}/${second}`)
    );

    return {
        scenarioCount: cells.length,
        fineCellCount: fine.size,
        coarseCovered: all.filter(cell => covered.has(cell)),
        coarseUncovered: all.filter(cell => !covered.has(cell)),
        coarseTotal: TOTAL_COARSE_CELLS,
    };
}
