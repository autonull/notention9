import { SEAM_IDS, type SeamId } from './seams';
import type { StrategyProfile } from '@notention/core/ui/profile';

export const DEFAULT_PROFILES: Omit<StrategyProfile, 'createdAt' | 'updatedAt'>[] = [
    {
        id: 'default',
        name: 'Default',
        description: 'Balanced experience for all users',
        strategySelections: {
            [SEAM_IDS.CAPTURE]: 'describe-it-composer',
            [SEAM_IDS.ELICIT]: 'tag-input',
            [SEAM_IDS.MATCH]: 'local-match-preview',
            [SEAM_IDS.LAYOUT]: 'property-panel',
        },
        isDefault: true,
    },
    {
        id: 'compact',
        name: 'Compact',
        description: 'Dense information, minimal UI',
        strategySelections: {
            [SEAM_IDS.CAPTURE]: 'quick-capture',
            [SEAM_IDS.ELICIT]: 'tag-input',
            [SEAM_IDS.MATCH]: 'dashboard-local-match',
            [SEAM_IDS.LAYOUT]: 'property-panel',
        },
        context: { persona: 'power-user' },
    },
    {
        id: 'guided',
        name: 'Guided',
        description: 'More explanations, progressive disclosure',
        strategySelections: {
            [SEAM_IDS.CAPTURE]: 'describe-it-composer',
            [SEAM_IDS.ELICIT]: 'insert-property-modal',
            [SEAM_IDS.MATCH]: 'local-match-preview',
            [SEAM_IDS.LAYOUT]: 'property-panel',
        },
        context: { persona: 'new-user' },
    },
    {
        id: 'accessible',
        name: 'Accessible',
        description: 'High contrast, full keyboard support, screen reader optimized',
        strategySelections: {
            [SEAM_IDS.CAPTURE]: 'describe-it-composer',
            [SEAM_IDS.ELICIT]: 'tag-input',
            [SEAM_IDS.MATCH]: 'local-match-preview',
            [SEAM_IDS.LAYOUT]: 'property-panel',
        },
        context: { persona: 'accessibility' },
    },
];

export function createProfiles(): StrategyProfile[] {
    const now = new Date().toISOString();
    return DEFAULT_PROFILES.map(p => ({ ...p, createdAt: now, updatedAt: now }));
}