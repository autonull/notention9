/**
 * Default profiles and experiments
 * Separated for clarity and maintainability
 */

import type { StrategyProfile, ProfilePolicy, StrategyExperiment } from './profileTypes.js';
import { SEAM_ROLES } from '../constants/seams.js';

// Default profiles
// Seam roles map to discovered seam IDs at runtime
export const DEFAULT_PROFILES: StrategyProfile[] = [
    {
        id: 'default',
        name: 'Default',
        description: 'Balanced experience for all users',
        strategySelections: {
            [SEAM_ROLES.CAPTURE]: 'describe-it-composer',
            [SEAM_ROLES.ELICIT]: 'tag-input',
            [SEAM_ROLES.MATCH]: 'local-match-preview',
            [SEAM_ROLES.LAYOUT]: 'property-panel',
        },
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'compact',
        name: 'Compact',
        description: 'Dense information, minimal UI',
        strategySelections: {
            [SEAM_ROLES.CAPTURE]: 'quick-capture',
            [SEAM_ROLES.ELICIT]: 'tag-input',
            [SEAM_ROLES.MATCH]: 'dashboard-local-match',
            [SEAM_ROLES.LAYOUT]: 'property-panel',
        },
        context: { persona: 'power-user' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'guided',
        name: 'Guided',
        description: 'More explanations, progressive disclosure',
        strategySelections: {
            [SEAM_ROLES.CAPTURE]: 'describe-it-composer',
            [SEAM_ROLES.ELICIT]: 'insert-property-modal',
            [SEAM_ROLES.MATCH]: 'local-match-preview',
            [SEAM_ROLES.LAYOUT]: 'property-panel',
        },
        context: { persona: 'new-user' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'accessible',
        name: 'Accessible',
        description: 'High contrast, full keyboard support, screen reader optimized',
        strategySelections: {
            [SEAM_ROLES.CAPTURE]: 'describe-it-composer',
            [SEAM_ROLES.ELICIT]: 'tag-input',
            [SEAM_ROLES.MATCH]: 'local-match-preview',
            [SEAM_ROLES.LAYOUT]: 'property-panel',
        },
        context: { persona: 'accessibility' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

// Default policy: auto-select profile based on context
export const DEFAULT_POLICY: ProfilePolicy = {
    id: 'auto-profile',
    name: 'Automatic Profile Selection',
    description: 'Select profile based on user context',
    rules: [
        {
            id: 'rule-accessibility',
            conditions: { persona: 'accessibility' },
            profileId: 'accessible',
            priority: 10,
        },
        {
            id: 'rule-new-user',
            conditions: { persona: 'new-user' },
            profileId: 'guided',
            priority: 20,
        },
        {
            id: 'rule-power-user',
            conditions: { persona: 'power-user' },
            profileId: 'compact',
            priority: 30,
        },
        {
            id: 'rule-mobile',
            conditions: { device: 'mobile' },
            profileId: 'compact',
            priority: 40,
        },
    ],
    fallbackProfileId: 'default',
    isEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

// Default match-display experiment
export const DEFAULT_MATCH_DISPLAY_EXPERIMENT: StrategyExperiment = {
    id: 'match-display-v1',
    name: 'Match Display: Detailed vs Compact',
    description: 'Compare detailed explanations (local-match-preview) vs compact (dashboard-local-match)',
    seamId: SEAM_ROLES.MATCH,
    variants: [
        {
            id: 'variant-detailed',
            seamId: SEAM_ROLES.MATCH,
            strategyId: 'local-match-preview',
            label: 'Detailed with Explanations',
            description: 'Shows why it fits, conflicts, missing details, and recovery options',
            isControl: true,
            weight: 0.5,
        },
        {
            id: 'variant-compact',
            seamId: SEAM_ROLES.MATCH,
            strategyId: 'dashboard-local-match',
            label: 'Compact Summary',
            description: 'Shows match score and basic actions only',
            isControl: false,
            weight: 0.5,
        },
    ],
    metrics: [
        { id: 'completion', name: 'Task Completion Rate', type: 'completion', direction: 'higher' },
        { id: 'time', name: 'Time to Decision', type: 'time', direction: 'lower' },
        { id: 'satisfaction', name: 'User Satisfaction', type: 'satisfaction', direction: 'higher' },
        { id: 'recovery_rate', name: 'Recovery Action Rate', type: 'engagement', direction: 'higher' },
    ],
    minSampleSize: 50,
    maxDurationDays: 14,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};