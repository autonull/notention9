/**
 * Browser-safe Profile Registry
 * Uses browser stub for revisionStore
 */

import type { Seam, Strategy, StrategyRegistrable, SeamRole } from './strategy.js';
import { Registry } from '../utils/Registry.js';
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
// Browser stub - throws error if used
import { getRevisionStore } from '../telemetry/revisionStore.browser.js';
import { getResolutionStrategyRegistry, ResolutionContext } from './resolutionStrategy.js';
import { assignToVariant } from '../utils/resolutionUtils.js';
import { resolveSeamId } from '../constants/seams.js';

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

    /**
     * Build resolution context - shared between sync and async resolve
     */
    private buildResolutionContext(
        userId: string,
        seamRole: SeamRole,
        strategyRegistry: Registry<StrategyRegistrable>,
        revisionStore?: { getActive(seamRole: string): Promise<any> }
    ): ResolutionContext {
        const config = this.getUserConfig(userId);
        const seamId = resolveSeamId(seamRole);

        return {
            userId,
            seamRole,
            seamId,
            userConfig: config,
            profiles: this.profiles,
            policies: this.policies,
            experiments: this.experiments,
            assignments: this.assignments,
            strategyRegistry,
            revisionStore,
        };
    }

    /**
     * Core resolution logic - uses Registry.resolveAll for first-match semantics
     * @param context - Resolution context
     * @param includeAsync - Whether to include async strategies (revision)
     */
    private async resolveCore<P extends object = Record<string, unknown>>(
        context: ResolutionContext,
        includeAsync = false
    ): Promise<ResolvedStrategy<P> | undefined> {
        const registry = getResolutionStrategyRegistry();
        const filter = includeAsync
            ? undefined
            : (s: any) => s.name !== 'revision';

        return registry.resolveAll<ResolutionContext, ResolvedStrategy<P>>(context, filter);
    }

    // Resolve strategy for a user and seam role (sync - no revision layer)
    resolveStrategy(userId: string, seamRole: SeamRole, strategyRegistry: Registry<StrategyRegistrable>): Strategy | undefined {
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
        strategyRegistry: Registry<StrategyRegistrable>
    ): ResolvedStrategy<P> | undefined {
        const context = this.buildResolutionContext(userId, seamRole, strategyRegistry);
        // Sync resolution: skip async revision strategy
        // Note: Registry.resolveAll is async, but all sync strategies return sync results
        // We use a synchronous fallback for backward compatibility
        return this.resolveCoreSync(context);
    }

    /**
     * Synchronous fallback for sync-only resolution
     * Iterates sync strategies in priority order
     */
    private resolveCoreSync<P extends object = Record<string, unknown>>(
        context: ResolutionContext
    ): ResolvedStrategy<P> | undefined {
        const registry = getResolutionStrategyRegistry();
        const strategies = registry.getAll().filter(s => s.appliesTo(context.seamRole) && s.name !== 'revision');

        for (const strategy of strategies) {
            const result = strategy.resolve(context);
            if (result) return result as ResolvedStrategy<P>;
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
        strategyRegistry: Registry<StrategyRegistrable>
    ): Promise<ResolvedStrategy<P> | undefined> {
        const context = this.buildResolutionContext(
            userId,
            seamRole,
            strategyRegistry,
            getRevisionStore()
        );

        // Async resolution: includes all strategies (including revision)
        return this.resolveCore(context, true);
    }

    /**
     * Get or create experiment assignment for user
     * Shared utility used by ExperimentResolutionStrategy
     */
    getOrCreateAssignment(experiment: StrategyExperiment, userId: string): ExperimentAssignment {
        const assignmentKey = `${experiment.id}:${userId}`;
        let assignment = this.assignments.get(assignmentKey);

        if (!assignment) {
            assignment = assignToVariant(experiment, userId);
            this.assignments.set(assignmentKey, assignment);
        }

        return assignment;
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