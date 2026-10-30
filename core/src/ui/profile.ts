import type { Seam, Strategy } from './strategy.js';
import { SEAM_IDS } from '../constants/seams.js';

/**
 * Strategy profile - a named collection of strategy selections per seam
 */
export interface StrategyProfile {
    id: string;
    name: string;
    description: string;
    // seamId -> strategyId mapping
    strategySelections: Record<string, string>;
    // When this profile is active (optional context)
    context?: ProfileContext;
    isDefault?: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Context conditions for automatic profile selection
 */
export interface ProfileContext {
    // View context: 'dashboard', 'notes', 'ontology', etc.
    view?: string;
    // User role or persona
    persona?: 'power-user' | 'casual' | 'new-user' | 'accessibility';
    // Device type
    device?: 'desktop' | 'tablet' | 'mobile';
    // Time of day, etc.
    timeContext?: string;
    // Custom conditions
    [key: string]: unknown;
}

/**
 * Profile policy - rules for automatic profile selection
 */
export interface ProfilePolicy {
    id: string;
    name: string;
    description: string;
    // Rules evaluated in order, first match wins
    rules: ProfileRule[];
    // Fallback profile if no rules match
    fallbackProfileId: string;
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProfileRule {
    id: string;
    // Condition to match (all must be true)
    conditions: Record<string, unknown>;
    // Profile to apply when conditions match
    profileId: string;
    priority: number;
}

/**
 * Per-user strategy overrides
 * Allows individual users to override strategy selections from their active profile
 */
export interface UserStrategyOverrides {
    userId: string;
    // seamId -> strategyId (overrides profile selection)
    overrides: Record<string, string>;
    updatedAt: string;
}

/**
 * Complete profile configuration for a user
 */
export interface UserProfileConfig {
    userId: string;
    activeProfileId: string;
    overrides: UserStrategyOverrides;
    // User can disable automatic profile switching
    manualMode: boolean;
    updatedAt: string;
}

/**
 * Strategy variant for A/B testing
 */
export interface StrategyVariant {
    id: string;
    seamId: string;
    strategyId: string;
    // Human-readable label for the variant
    label: string;
    description: string;
    // Whether this is the control (baseline) variant
    isControl: boolean;
    // Weight for random assignment (0-1)
    weight: number;
}

/**
 * Experiment configuration for strategy comparison
 */
export interface StrategyExperiment {
    id: string;
    name: string;
    description: string;
    seamId: string;
    variants: StrategyVariant[];
    // Metrics to track
    metrics: ExperimentMetric[];
    // Minimum sample size per variant
    minSampleSize: number;
    // Maximum duration
    maxDurationDays?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ExperimentMetric {
    id: string;
    name: string;
    // 'completion' | 'time' | 'satisfaction' | 'error_rate' | 'engagement'
    type: string;
    // Higher is better or lower is better
    direction: 'higher' | 'lower';
}

/**
 * Experiment assignment for a user/session
 */
export interface ExperimentAssignment {
    experimentId: string;
    userId: string;
    variantId: string;
    assignedAt: string;
    // Track which variant was actually used
    exposureCount: number;
    lastExposureAt: string;
}

/**
 * Experiment result
 */
export interface ExperimentResult {
    experimentId: string;
    variantId: string;
    sampleSize: number;
    metrics: Record<string, number>;
    confidenceInterval: Record<string, [number, number]>;
    isSignificant: boolean;
    winner?: string;
    computedAt: string;
}

// Default profiles
// Seam IDs match the discovered seams from loop/runs/discovered.json
export const DEFAULT_PROFILES: StrategyProfile[] = [
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
    seamId: SEAM_IDS.MATCH,
    variants: [
        {
            id: 'variant-detailed',
            seamId: SEAM_IDS.MATCH,
            strategyId: 'local-match-preview',
            label: 'Detailed with Explanations',
            description: 'Shows why it fits, conflicts, missing details, and recovery options',
            isControl: true,
            weight: 0.5,
        },
        {
            id: 'variant-compact',
            seamId: SEAM_IDS.MATCH,
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

/**
 * Profile registry - manages profiles, policies, and user configs
 */
export class ProfileRegistry {
    private profiles = new Map<string, StrategyProfile>();
    private policies = new Map<string, ProfilePolicy>();
    private userConfigs = new Map<string, UserProfileConfig>();
    private experiments = new Map<string, StrategyExperiment>();
    private assignments = new Map<string, ExperimentAssignment>(); // key: ${experimentId}:${userId}

    constructor() {
        // Register defaults
        for (const profile of DEFAULT_PROFILES) {
            this.profiles.set(profile.id, profile);
        }
        this.policies.set(DEFAULT_POLICY.id, DEFAULT_POLICY);
        this.experiments.set(DEFAULT_MATCH_DISPLAY_EXPERIMENT.id, DEFAULT_MATCH_DISPLAY_EXPERIMENT);
    }

    // Profile management
    registerProfile(profile: StrategyProfile): void {
        this.profiles.set(profile.id, { ...profile, updatedAt: new Date().toISOString() });
    }

    getProfile(id: string): StrategyProfile | undefined {
        return this.profiles.get(id);
    }

    getAllProfiles(): StrategyProfile[] {
        return Array.from(this.profiles.values());
    }

    getDefaultProfile(): StrategyProfile | undefined {
        return Array.from(this.profiles.values()).find(p => p.isDefault) ?? DEFAULT_PROFILES[0];
    }

    // Policy management
    registerPolicy(policy: ProfilePolicy): void {
        this.policies.set(policy.id, { ...policy, updatedAt: new Date().toISOString() });
    }

    getPolicy(id: string): ProfilePolicy | undefined {
        return this.policies.get(id);
    }

    getActivePolicy(): ProfilePolicy | undefined {
        return Array.from(this.policies.values()).find(p => p.isEnabled);
    }

    // User config management
    getUserConfig(userId: string): UserProfileConfig {
        let config = this.userConfigs.get(userId);
        if (!config) {
            const defaultProfile = this.getDefaultProfile();
            config = {
                userId,
                activeProfileId: defaultProfile?.id ?? 'default',
                overrides: {
                    userId,
                    overrides: {},
                    updatedAt: new Date().toISOString(),
                },
                manualMode: false,
                updatedAt: new Date().toISOString(),
            };
            this.userConfigs.set(userId, config);
        }
        return config;
    }

    setUserConfig(config: UserProfileConfig): void {
        this.userConfigs.set(config.userId, { ...config, updatedAt: new Date().toISOString() });
    }

    setActiveProfile(userId: string, profileId: string): boolean {
        const profile = this.profiles.get(profileId);
        if (!profile) return false;
        
        const config = this.getUserConfig(userId);
        config.activeProfileId = profileId;
        config.manualMode = true;
        config.updatedAt = new Date().toISOString();
        this.userConfigs.set(userId, config);
        return true;
    }

    setManualMode(userId: string, manual: boolean): void {
        const config = this.getUserConfig(userId);
        config.manualMode = manual;
        config.updatedAt = new Date().toISOString();
        this.userConfigs.set(userId, config);
    }

    setOverride(userId: string, seamId: string, strategyId: string): void {
        const config = this.getUserConfig(userId);
        config.overrides.overrides[seamId] = strategyId;
        config.overrides.updatedAt = new Date().toISOString();
        config.updatedAt = new Date().toISOString();
        this.userConfigs.set(userId, config);
    }

    removeOverride(userId: string, seamId: string): void {
        const config = this.getUserConfig(userId);
        delete config.overrides.overrides[seamId];
        config.overrides.updatedAt = new Date().toISOString();
        config.updatedAt = new Date().toISOString();
        this.userConfigs.set(userId, config);
    }

    // Resolve strategy for a user and seam
    resolveStrategy(userId: string, seamId: string, strategyRegistry: Map<string, Map<string, Strategy>>): Strategy | undefined {
        const config = this.getUserConfig(userId);
        
        // 1. Check user overrides first
        if (config.overrides.overrides[seamId]) {
            const strategyId = config.overrides.overrides[seamId];
            return strategyRegistry.get(seamId)?.get(strategyId);
        }

        // 2. Check active experiment assignment
        for (const experiment of this.experiments.values()) {
            if (!experiment.isActive || experiment.seamId !== seamId) continue;
            
            const assignmentKey = `${experiment.id}:${userId}`;
            let assignment = this.assignments.get(assignmentKey);
            
            if (!assignment) {
                // Assign to variant based on weights
                assignment = this.assignToVariant(experiment, userId);
                this.assignments.set(assignmentKey, assignment);
            }
            
            const variant = experiment.variants.find(v => v.id === assignment.variantId);
            if (variant) {
                return strategyRegistry.get(seamId)?.get(variant.strategyId);
            }
        }

        // 3. Check manual mode
        if (config.manualMode) {
            const profile = this.profiles.get(config.activeProfileId);
            if (profile?.strategySelections[seamId]) {
                return strategyRegistry.get(seamId)?.get(profile.strategySelections[seamId]);
            }
        }

        // 4. Auto-select profile via policy
        const policy = this.getActivePolicy();
        if (policy) {
            const profile = this.selectProfileByPolicy(policy, config);
            if (profile?.strategySelections[seamId]) {
                return strategyRegistry.get(seamId)?.get(profile.strategySelections[seamId]);
            }
        }

        // 5. Fallback to default profile
        const defaultProfile = this.getDefaultProfile();
        if (defaultProfile?.strategySelections[seamId]) {
            return strategyRegistry.get(seamId)?.get(defaultProfile.strategySelections[seamId]);
        }

        // 6. Last resort: first available strategy for seam
        const seamStrategies = strategyRegistry.get(seamId);
        return seamStrategies?.values().next().value;
    }

    private selectProfileByPolicy(policy: ProfilePolicy, config: UserProfileConfig): StrategyProfile | undefined {
        // Evaluate rules in priority order
        const sortedRules = [...policy.rules].sort((a, b) => a.priority - b.priority);
        
        for (const rule of sortedRules) {
            if (this.matchConditions(rule.conditions, config)) {
                return this.profiles.get(rule.profileId);
            }
        }
        
        return this.profiles.get(policy.fallbackProfileId);
    }

    private matchConditions(conditions: Record<string, unknown>, config: UserProfileConfig): boolean {
        // Check active profile context
        const activeProfile = this.profiles.get(config.activeProfileId);
        const context = activeProfile?.context ?? {};
        
        for (const [key, value] of Object.entries(conditions)) {
            if (context[key] !== value) {
                return false;
            }
        }
        return true;
    }

    private assignToVariant(experiment: StrategyExperiment, userId: string): ExperimentAssignment {
        // Simple weighted random assignment
        const rand = Math.random();
        let cumulative = 0;
        
        for (const variant of experiment.variants) {
            cumulative += variant.weight;
            if (rand <= cumulative) {
                return {
                    experimentId: experiment.id,
                    userId,
                    variantId: variant.id,
                    assignedAt: new Date().toISOString(),
                    exposureCount: 0,
                    lastExposureAt: new Date().toISOString(),
                };
            }
        }
        
        // Fallback to first variant
        return {
            experimentId: experiment.id,
            userId,
            variantId: experiment.variants[0].id,
            assignedAt: new Date().toISOString(),
            exposureCount: 0,
            lastExposureAt: new Date().toISOString(),
        };
    }

    // Experiment management
    registerExperiment(experiment: StrategyExperiment): void {
        this.experiments.set(experiment.id, { ...experiment, updatedAt: new Date().toISOString() });
    }

    getExperiment(id: string): StrategyExperiment | undefined {
        return this.experiments.get(id);
    }

    getActiveExperiments(): StrategyExperiment[] {
        return Array.from(this.experiments.values()).filter(e => e.isActive);
    }

    recordExposure(experimentId: string, userId: string): void {
        const key = `${experimentId}:${userId}`;
        const assignment = this.assignments.get(key);
        if (assignment) {
            assignment.exposureCount++;
            assignment.lastExposureAt = new Date().toISOString();
            this.assignments.set(key, assignment);
        }
    }

    // Serialization for persistence
    toJSON(): {
        profiles: StrategyProfile[];
        policies: ProfilePolicy[];
        userConfigs: UserProfileConfig[];
        experiments: StrategyExperiment[];
        assignments: ExperimentAssignment[];
    } {
        return {
            profiles: Array.from(this.profiles.values()),
            policies: Array.from(this.policies.values()),
            userConfigs: Array.from(this.userConfigs.values()),
            experiments: Array.from(this.experiments.values()),
            assignments: Array.from(this.assignments.values()),
        };
    }

    static fromJSON(data: {
        profiles: StrategyProfile[];
        policies: ProfilePolicy[];
        userConfigs: UserProfileConfig[];
        experiments: StrategyExperiment[];
        assignments: ExperimentAssignment[];
    }): ProfileRegistry {
        const registry = new ProfileRegistry();
        
        // Clear defaults
        registry.profiles.clear();
        registry.policies.clear();
        registry.experiments.clear();
        
        for (const profile of data.profiles) {
            registry.profiles.set(profile.id, profile);
        }
        for (const policy of data.policies) {
            registry.policies.set(policy.id, policy);
        }
        for (const config of data.userConfigs) {
            registry.userConfigs.set(config.userId, config);
        }
        for (const experiment of data.experiments) {
            registry.experiments.set(experiment.id, experiment);
        }
        for (const assignment of data.assignments) {
            registry.assignments.set(`${assignment.experimentId}:${assignment.userId}`, assignment);
        }
        
        return registry;
    }
}

// Singleton instance
export const profileRegistry = new ProfileRegistry();