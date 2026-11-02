/**
 * Profile registry - manages profiles, policies, and user configs
 * Single source of truth for profile management
 */

import type { Seam, Strategy, StrategyRegistry, SeamRole } from './strategy.js';
import {
    type StrategyProfile,
    type ProfilePolicy,
    type UserProfileConfig,
    type UserStrategyOverrides,
    type StrategyExperiment,
    type ExperimentAssignment,
    type ResolutionReason,
    type ResolvedStrategy,
} from './profileTypes.js';
import { DEFAULT_PROFILES, DEFAULT_POLICY, DEFAULT_MATCH_DISPLAY_EXPERIMENT } from './profileDefaults.js';
import { SEAM_ROLES, resolveSeamId } from '../constants/seams.js';
import { getRevisionStore, type Revision } from '../telemetry/revisionStore.js';

/**
 * Profile registry - manages profiles, policies, and user configs
 */
export class ProfileRegistry {
    private profiles = new Map<string, StrategyProfile>();
    private policies = new Map<string, ProfilePolicy>();
    private userConfigs = new Map<string, UserProfileConfig>();
    private experiments = new Map<string, StrategyExperiment>();
    private assignments = new Map<string, ExperimentAssignment>(); // key: ${experimentId}:${userId}
    private strategyRegistry: StrategyRegistry | null = null;

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

    setOverride(userId: string, seamRole: SeamRole, strategyId: string): void {
        const config = this.getUserConfig(userId);
        (config.overrides.overrides as Record<string, string>)[seamRole] = strategyId;
        config.overrides.updatedAt = new Date().toISOString();
        config.updatedAt = new Date().toISOString();
        this.userConfigs.set(userId, config);
    }

    removeOverride(userId: string, seamRole: SeamRole): void {
        const config = this.getUserConfig(userId);
        delete (config.overrides.overrides as Record<string, string>)[seamRole];
        config.overrides.updatedAt = new Date().toISOString();
        config.updatedAt = new Date().toISOString();
        this.userConfigs.set(userId, config);
    }

    // Strategy resolution step interface
    private readonly resolutionSteps: Array<{
        tryResolve(config: UserProfileConfig, seamRole: SeamRole, seamId: string): Strategy | undefined;
    }> = [
        // 1. User overrides (highest priority)
        {
            tryResolve: (config, seamRole, seamId) => {
                const overrideId = (config.overrides.overrides as Record<string, string>)[seamRole];
                return overrideId ? this.strategyRegistry?.get(seamId, overrideId) : undefined;
            },
        },
        // 2. Active experiment assignment
        {
            tryResolve: (config, seamRole, seamId) => {
                for (const experiment of this.experiments.values()) {
                    if (!experiment.isActive || experiment.seamId !== seamRole) continue;

                    const assignmentKey = `${experiment.id}:${config.userId}`;
                    let assignment = this.assignments.get(assignmentKey);

                    if (!assignment) {
                        assignment = this.assignToVariant(experiment, config.userId);
                        this.assignments.set(assignmentKey, assignment);
                    }

                    const variant = experiment.variants.find(v => v.id === assignment.variantId);
                    if (variant) {
                        return this.strategyRegistry?.get(seamId, variant.strategyId);
                    }
                }
                return undefined;
            },
        },
        // 3. Manual mode with active profile
        {
            tryResolve: (config, seamRole, seamId) => {
                if (!config.manualMode) return undefined;
                const profile = this.profiles.get(config.activeProfileId);
                const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
                return strategyId ? this.strategyRegistry?.get(seamId, strategyId) : undefined;
            },
        },
        // 4. Auto-select profile via policy
        {
            tryResolve: (config, seamRole, seamId) => {
                const policy = this.getActivePolicy();
                if (!policy) return undefined;
                const profile = this.selectProfileByPolicy(policy, config);
                const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
                return strategyId ? this.strategyRegistry?.get(seamId, strategyId) : undefined;
            },
        },
        // 5. Default profile
        {
            tryResolve: (_, seamRole, seamId) => {
                const defaultProfile = this.getDefaultProfile();
                const strategyId = (defaultProfile?.strategySelections as Record<string, string>)[seamRole];
                return strategyId ? this.strategyRegistry?.get(seamId, strategyId) : undefined;
            },
        },
        // 6. Last resort: first available strategy for seam
        {
            tryResolve: (_, seamRole, seamId) => {
                const seamStrategies = this.strategyRegistry?.getAllForSeam(seamId) ?? [];
                return seamStrategies[0];
            },
        },
    ];

    // Resolve strategy for a user and seam role using pipeline (sync - no revision layer)
    resolveStrategy(userId: string, seamRole: SeamRole, strategyRegistry: StrategyRegistry): Strategy | undefined {
        const result = this.resolveStrategyWithMeta(userId, seamRole, strategyRegistry);
        return result?.strategy;
    }

    /**
     * Synchronous resolve without revision layer (backward compatible)
     * For full revision layer support, use resolveStrategyWithMetaAsync
     */
    resolveStrategyWithMeta<P extends object = Record<string, unknown>>(
        userId: string,
        seamRole: SeamRole,
        strategyRegistry: StrategyRegistry
    ): ResolvedStrategy<P> | undefined {
        // Store registry reference for step functions
        this.strategyRegistry = strategyRegistry;

        const config = this.getUserConfig(userId);
        const seamId = this.resolveSeamId(seamRole, strategyRegistry);

        // Run pipeline with reason tracking (sync steps only)
        for (const step of this.buildSyncResolutionStepsWithReason()) {
            const result = step.tryResolve(config, seamRole, seamId);
            if (result) {
                const { strategy, reason } = result;
                return {
                    strategy: strategy as Strategy<P>,
                    reason,
                    resolvedParams: strategy.getDefaultProps() as P,
                    resolvedAt: new Date().toISOString(),
                    userId,
                    seamRole,
                };
            }
        }

        return undefined;
    }

    /**
     * Async resolve with full revision layer support
     * Includes active revision check between experiment and manual profile layers
     */
    async resolveStrategyWithMetaAsync<P extends object = Record<string, unknown>>(
        userId: string,
        seamRole: SeamRole,
        strategyRegistry: StrategyRegistry
    ): Promise<ResolvedStrategy<P> | undefined> {
        // Store registry reference for step functions
        this.strategyRegistry = strategyRegistry;

        const config = this.getUserConfig(userId);
        const seamId = this.resolveSeamId(seamRole, strategyRegistry);

        // Run pipeline with reason tracking (async steps supported)
        for (const step of this.buildAsyncResolutionStepsWithReason()) {
            const result = await step.tryResolve(config, seamRole, seamId);
            if (result) {
                const { strategy, reason } = result;
                return {
                    strategy: strategy as Strategy<P>,
                    reason,
                    resolvedParams: strategy.getDefaultProps() as P,
                    resolvedAt: new Date().toISOString(),
                    userId,
                    seamRole,
                };
            }
        }

        return undefined;
    }

    /**
     * Build synchronous resolution steps with reason tracking (no revision layer)
     */
    private buildSyncResolutionStepsWithReason(): Array<{
        tryResolve(config: UserProfileConfig, seamRole: SeamRole, seamId: string): { strategy: Strategy; reason: ResolutionReason } | undefined;
    }> {
        return [
            // 1. User overrides (highest priority)
            {
                tryResolve: (config: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    const overrideId = (config.overrides.overrides as Record<string, string>)[seamRole];
                    const strategy = overrideId ? this.strategyRegistry?.get(seamId, overrideId) : undefined;
                    return strategy ? { strategy, reason: { kind: 'override', strategyId: overrideId } } : undefined;
                },
            },
            // 2. Active experiment assignment
            {
                tryResolve: (config: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    for (const experiment of this.experiments.values()) {
                        if (!experiment.isActive || experiment.seamId !== seamRole) continue;

                        const assignmentKey = `${experiment.id}:${config.userId}`;
                        let assignment = this.assignments.get(assignmentKey);

                        if (!assignment) {
                            assignment = this.assignToVariant(experiment, config.userId);
                            this.assignments.set(assignmentKey, assignment);
                        }

                        const variant = experiment.variants.find(v => v.id === assignment.variantId);
                        if (variant) {
                            const strategy = this.strategyRegistry?.get(seamId, variant.strategyId);
                            if (strategy) {
                                return { strategy, reason: { kind: 'experiment', experimentId: experiment.id, variantId: variant.id } };
                            }
                        }
                    }
                    return undefined;
                },
            },
            // 3. Manual mode with active profile
            {
                tryResolve: (config: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    if (!config.manualMode) return undefined;
                    const profile = this.profiles.get(config.activeProfileId);
                    const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
                    const strategy = strategyId ? this.strategyRegistry?.get(seamId, strategyId) : undefined;
                    return strategy ? { strategy, reason: { kind: 'manual-profile', profileId: config.activeProfileId } } : undefined;
                },
            },
            // 4. Auto-select profile via policy
            {
                tryResolve: (config: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    const policy = this.getActivePolicy();
                    if (!policy) return undefined;
                    const profile = this.selectProfileByPolicy(policy, config);
                    const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
                    const strategy = strategyId ? this.strategyRegistry?.get(seamId, strategyId) : undefined;
                    if (strategy) {
                        // Find which rule matched
                        const sortedRules = [...policy.rules].sort((a, b) => a.priority - b.priority);
                        for (const rule of sortedRules) {
                            if (this.matchConditions(rule.conditions, config)) {
                                return { strategy, reason: { kind: 'policy', policyId: policy.id, ruleId: rule.id } };
                            }
                        }
                        return { strategy, reason: { kind: 'policy', policyId: policy.id, ruleId: 'fallback' } };
                    }
                    return undefined;
                },
            },
            // 5. Default profile
            {
                tryResolve: (_: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    const defaultProfile = this.getDefaultProfile();
                    const strategyId = (defaultProfile?.strategySelections as Record<string, string>)[seamRole];
                    const strategy = strategyId ? this.strategyRegistry?.get(seamId, strategyId) : undefined;
                    return strategy ? { strategy, reason: { kind: 'default-profile', profileId: defaultProfile!.id } } : undefined;
                },
            },
            // 6. Last resort: first available strategy for seam
            {
                tryResolve: (_: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    const seamStrategies = this.strategyRegistry?.getAllForSeam(seamId) ?? [];
                    const strategy = seamStrategies[0];
                    return strategy ? { strategy, reason: { kind: 'fallback', seamId } } : undefined;
                },
            },
        ];
    }

    /**
     * Build async resolution steps with reason tracking (includes revision layer)
     */
    private buildAsyncResolutionStepsWithReason(): Array<{
        tryResolve(config: UserProfileConfig, seamRole: SeamRole, seamId: string): Promise<{ strategy: Strategy; reason: ResolutionReason } | undefined>;
    }> {
        return [
            // 1. User overrides (highest priority)
            {
                tryResolve: async (config: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    const overrideId = (config.overrides.overrides as Record<string, string>)[seamRole];
                    const strategy = overrideId ? this.strategyRegistry?.get(seamId, overrideId) : undefined;
                    return strategy ? { strategy, reason: { kind: 'override', strategyId: overrideId } } : undefined;
                },
            },
            // 2. Active experiment assignment
            {
                tryResolve: async (config: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    for (const experiment of this.experiments.values()) {
                        if (!experiment.isActive || experiment.seamId !== seamRole) continue;

                        const assignmentKey = `${experiment.id}:${config.userId}`;
                        let assignment = this.assignments.get(assignmentKey);

                        if (!assignment) {
                            assignment = this.assignToVariant(experiment, config.userId);
                            this.assignments.set(assignmentKey, assignment);
                        }

                        const variant = experiment.variants.find(v => v.id === assignment.variantId);
                        if (variant) {
                            const strategy = this.strategyRegistry?.get(seamId, variant.strategyId);
                            if (strategy) {
                                return { strategy, reason: { kind: 'experiment', experimentId: experiment.id, variantId: variant.id } };
                            }
                        }
                    }
                    return undefined;
                },
            },
            // 3. Active revision for (scope, target) — NEW revision layer
            {
                tryResolve: async (config: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    const revisionStore = getRevisionStore();
                    const activeRevision = await revisionStore.getActive(seamRole);
                    
                    if (activeRevision && activeRevision.status === 'active' && activeRevision.consentedBy) {
                        const strategy = this.strategyRegistry?.get(seamId, activeRevision.strategy.id);
                        if (strategy) {
                            // Apply revision params on top of strategy defaults
                            const revisionParams = activeRevision.strategy.params ?? {};
                            const mergedParams = { ...strategy.getDefaultProps(), ...revisionParams };
                            
                            // Create a strategy wrapper that uses merged params
                            const revisionStrategy: Strategy = {
                                ...strategy,
                                getDefaultProps: () => mergedParams,
                            };
                            
                            return { 
                                strategy: revisionStrategy, 
                                reason: { kind: 'revision', revisionId: activeRevision.id, seamRole } 
                            };
                        }
                    }
                    return undefined;
                },
            },
            // 4. Manual mode with active profile
            {
                tryResolve: async (config: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    if (!config.manualMode) return undefined;
                    const profile = this.profiles.get(config.activeProfileId);
                    const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
                    const strategy = strategyId ? this.strategyRegistry?.get(seamId, strategyId) : undefined;
                    return strategy ? { strategy, reason: { kind: 'manual-profile', profileId: config.activeProfileId } } : undefined;
                },
            },
            // 5. Auto-select profile via policy
            {
                tryResolve: async (config: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    const policy = this.getActivePolicy();
                    if (!policy) return undefined;
                    const profile = this.selectProfileByPolicy(policy, config);
                    const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
                    const strategy = strategyId ? this.strategyRegistry?.get(seamId, strategyId) : undefined;
                    if (strategy) {
                        // Find which rule matched
                        const sortedRules = [...policy.rules].sort((a, b) => a.priority - b.priority);
                        for (const rule of sortedRules) {
                            if (this.matchConditions(rule.conditions, config)) {
                                return { strategy, reason: { kind: 'policy', policyId: policy.id, ruleId: rule.id } };
                            }
                        }
                        return { strategy, reason: { kind: 'policy', policyId: policy.id, ruleId: 'fallback' } };
                    }
                    return undefined;
                },
            },
            // 6. Default profile
            {
                tryResolve: async (_: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    const defaultProfile = this.getDefaultProfile();
                    const strategyId = (defaultProfile?.strategySelections as Record<string, string>)[seamRole];
                    const strategy = strategyId ? this.strategyRegistry?.get(seamId, strategyId) : undefined;
                    return strategy ? { strategy, reason: { kind: 'default-profile', profileId: defaultProfile!.id } } : undefined;
                },
            },
            // 7. Last resort: first available strategy for seam
            {
                tryResolve: async (_: UserProfileConfig, seamRole: SeamRole, seamId: string) => {
                    const seamStrategies = this.strategyRegistry?.getAllForSeam(seamId) ?? [];
                    const strategy = seamStrategies[0];
                    return strategy ? { strategy, reason: { kind: 'fallback', seamId } } : undefined;
                },
            },
        ];
    }

    /**
     * Resolve a seam role to the actual discovered seam ID
     */
    private resolveSeamId(seamRole: SeamRole, strategyRegistry: StrategyRegistry): string {
        const seams = strategyRegistry.listSeams();
        const discovered = seams.find(s => s.id.startsWith(`${seamRole}-`));
        return discovered?.id ?? `${seamRole}-0`;
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

// Re-export types for consumers
export type {
    StrategyProfile,
    ProfilePolicy,
    UserProfileConfig,
    UserStrategyOverrides,
    StrategyExperiment,
    StrategyVariant,
    ExperimentMetric,
    ExperimentAssignment,
    ExperimentResult,
    ProfileContext,
    ProfileRule,
    ResolutionReason,
    ResolvedStrategy,
} from './profileTypes.js';

export { DEFAULT_PROFILES, DEFAULT_POLICY, DEFAULT_MATCH_DISPLAY_EXPERIMENT } from './profileDefaults.js';
export { SEAM_ROLES } from '../constants/seams.js';
export { type SeamRole } from './strategy.js';