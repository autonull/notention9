// Seam IDs from discovery (sync with loop/discovered.json)
export const SEAM_IDS = {
    CAPTURE: 'capture-20',
    ELICIT: 'elicit-1',
    MATCH: 'match-7',
    DISPLAY: 'display-38',
    LAYOUT: 'layout-8',
    ONTOLOGY: 'ontology-5',
    INTENT: 'intent-1',
} as const;

export type SeamId = typeof SEAM_IDS[keyof typeof SEAM_IDS];