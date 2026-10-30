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

export const SEAM_OPTIONS = [
    { value: SEAM_IDS.CAPTURE, label: 'Capture' },
    { value: SEAM_IDS.ELICIT, label: 'Elicit' },
    { value: SEAM_IDS.MATCH, label: 'Match Display' },
    { value: SEAM_IDS.LAYOUT, label: 'Layout' },
] as const;