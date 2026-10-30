import { SEAM_IDS, type SeamId } from '@notention/core/constants/seams';

export { SEAM_IDS, type SeamId };

export const SEAM_OPTIONS = [
    { value: SEAM_IDS.CAPTURE, label: 'Capture' },
    { value: SEAM_IDS.ELICIT, label: 'Elicit' },
    { value: SEAM_IDS.MATCH, label: 'Match Display' },
    { value: SEAM_IDS.LAYOUT, label: 'Layout' },
] as const;