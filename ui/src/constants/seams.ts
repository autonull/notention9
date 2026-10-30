import { SEAM_ROLES, type SeamRole } from '@notention/core/constants/seams';

export { SEAM_ROLES, type SeamRole };

export const SEAM_OPTIONS = [
    { value: SEAM_ROLES.CAPTURE, label: 'Capture' },
    { value: SEAM_ROLES.ELICIT, label: 'Elicit' },
    { value: SEAM_ROLES.MATCH, label: 'Match Display' },
    { value: SEAM_ROLES.LAYOUT, label: 'Layout' },
] as const;