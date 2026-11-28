/**
 * StrategySystem - Unified Strategy/Profile/Resolution System
 * 
 * Encapsulates all strategy, profile, and resolution logic in a single class.
 * Eliminates circular dependencies and provides a single import point.
 * 
 * @example
 * ```typescript
 * const strategySystem = new StrategySystem();
 * strategySystem.registerStrategy(myStrategy);
 * const resolved = await strategySystem.resolveStrategy('user1', 'match');
 * ```
 */

import { z } from 'zod';
import { Registry, createInstanceRegistry, Resolvable } from '../utils/Registry.js';
import { Plugin } from '../utils/BasePlugin.js';
import { observeStrategySystem, withObservabilitySync, EventSeverity } from '../utils/observability.js';

// Re-export types
export type { 
    StrategyRegistrable, 
    Strategy, 
    Seam, 
    SeamRole,
    ParamSpec 
} from './strategy.js';
export type { 
    StrategyProfile, 
    ProfilePolicy, 
    UserProfileConfig, 
    UserStrategyOverrides,
    StrategyExperiment, 
    ExperimentAssignment,
    ResolutionReason,
    ResolvedStrategy 
} from './profileTypes.js';
export type { ResolutionStrategy, ResolutionContext, ResolutionStrategyConfig } from './resolutionStrategy.js';

// Import concrete types for implementation
import type { 
    StrategyProfile, 
    ProfilePolicy, 
    UserProfileConfig, 
    UserStrategyOverrides,
    StrategyExperiment, 
    ExperimentAssignment,
    ResolutionReason,
    ResolvedStrategy,
    SeamRole 
} from './profileTypes.js';
import type { Strategy, Seam, ParamSpec, StrategyRegistrable } from './strategy.js';
import type { ResolutionStrategy, ResolutionContext, ResolutionStrategyConfig } from './resolutionStrategy.js';
import { 
    OverrideResolutionStrategy, 
    ExperimentResolutionStrategy, 
    RevisionResolutionStrategy, 
    ManualProfileResolutionStrategy, 
    PolicyResolutionStrategy, 
    DefaultProfileResolutionStrategy, 
    FallbackResolutionStrategy 
} from './resolutionStrategy.js';
import { 
    DEFAULT_PROFILES, 
    DEFAULT_POLICY, 
    DEFAULT_MATCH_DISPLAY_EXPERIMENT 
} from './profileDefaults.js';
import { resolveSeamId } from '../constants/seams.js';
import { assignToVariant, matchConditions, selectProfileByPolicy } from '../utils/resolutionUtils.js';
import { RevisionStoreLike, ResolutionRevisionStore } from './ProfileRegistry.base.js';

// --- Profile Registry ---

export class ProfileRegistry {
    protected profiles = new Map<string, StrategyProfile>();
    protected policies = new Map<string, ProfilePolicy>();
    protected userConfigs = new Map<string, UserProfileConfig>();
    protected experiments = new Map<string, StrategyExperiment>();
    protected assignments = new Map<string, ExperimentAssignment>();
    private readonly observeOp: ReturnType<typeof withObservabilitySync<StrategySystemEventAttributes, any>>;

    constructor() {
        for (const profile of DEFAULT_PROFILES) {
            this.profiles.set(profile.id, profile);
        }
        this.policies.set(DEFAULT_POLICY.id, DEFAULT_POLICY);
        this.experiments.set(DEFAULT_MATCH_DISPLAY_EXPERIMENT.id, DEFAULT_MATCH_DISPLAY_EXPERIMENT);
        
        this.observeOp = withObservabilitySync<StrategySystemEventAttributes, any>({
            observeFn: observeStrategySystem,
            operation: '',
            staticAttrs: {},
            errorKey: 'strategysystem.error',
            getSeverity: (err) => err ? EventSeverity.ERROR : EventSeverity.INFO,
            durationKey: 'strategysystem.duration.ms',
        });
    }

    private observe(operation: string, dynamicAttrs: Partial<StrategySystemEventAttributes>, fn: () => any) {
        return this.observeOp({ ...dynamicAttrs, 'strategysystem.operation': operation }, fn);
    }

    reset(): void {
        this.profiles.clear();
        this.policies.clear();
        this.userConfigs.clear();
        this.experiments.clear();
        this.assignments.clear();
        
        for (const profile of DEFAULT_PROFILES) {
            this.profiles.set(profile.id, profile);
        }
        this.policies.set(DEFAULT_POLICY.id, DEFAULT_POLICY);
        this.experiments.set(DEFAULT_MATCH_DISPLAY_EXPERIMENT.id, DEFAULT_MATCH_DISPLAY_EXPERIMENT);
    }

    // Profile management
    registerProfile(profile: StrategyProfile): void {
        this.observe('registerProfile', { 'strategysystem.profile': profile.id }, () => {
            this.profiles.set(profile.id, { ...profile, updatedAt: new Date().toISOString() });
        });
    }

    getProfile(id: string): StrategyProfile | undefined {
        return this.observe('getProfile', { 'strategysystem.profile': id }, () => this.profiles.get(id));
    }

    getAllProfiles(): StrategyProfile[] {
        return this.observe('getAllProfiles', {}, () => Array.from(this.profiles.values()));
    }

    getDefaultProfile(): StrategyProfile | undefined {
        return this.observe('getDefaultProfile', {}, () => 
            Array.from(this.profiles.values()).find(p => p.isDefault) ?? DEFAULT_PROFILES[0]
        );
    }

    // Policy management
    registerPolicy(policy: ProfilePolicy): void {
        this.observe('registerPolicy', { 'strategysystem.profile': policy.id }, () => {
            this.policies.set(policy.id, { ...policy, updatedAt: new Date().toISOString() });
        });
    }

    getPolicy(id: string): ProfilePolicy | undefined {
        return this.observe('getPolicy', { 'strategysystem.profile': id }, () => this.policies.get(id));
    }

    getActivePolicy(): ProfilePolicy | undefined {
        return this.observe('getActivePolicy', {}, () => 
            Array.from(this.policies.values()).find(p => p.isEnabled)
        );
    }

    // User config management
    getUserConfig(userId: string): UserProfileConfig {
        return this.observe('getUserConfig', { 'strategysystem.userId': userId }, () => {
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
        });
    }

    setUserConfig(config: UserProfileConfig): void {
        this.observe('setUserConfig', { 'strategysystem.userId': config.userId }, () => {
            this.userConfigs.set(config.userId, { ...config, updatedAt: new Date().toISOString() });
        });
    }

    setActiveProfile(userId: string, profileId: string): boolean {
        return this.observe('setActiveProfile', { 'strategysystem.userId': userId, 'strategysystem.profile': profileId }, () => {
            const profile = this.profiles.get(profileId);
            if (!profile) return false;

            const config = this.getUserConfig(userId);
            config.activeProfileId = profileId;
            config.manualMode = true;
            config.updatedAt = new Date().toISOString();
            this.userConfigs.set(userId, config);
            return true;
        });
    }

    setManualMode(userId: string, manual: boolean): void {
        this.observe('setManualMode', { 'strategysystem.userId': userId }, () => {
            const config = this.getUserConfig(userId);
            config.manualMode = manual;
            config.updatedAt = new Date().toISOString();
            this.userConfigs.set(userId, config);
        });
    }

    setOverride(userId: string, seamRole: SeamRole, strategyId: string): void {
        this.observe('setOverride', { 'strategysystem.userId': userId, 'strategysystem.seam': seamRole, 'strategysystem.strategy': strategyId }, () => {
            const config = this.getUserConfig(userId);
            (config.overrides.overrides as Record<string, string>)[seamRole] = strategyId;
            config.overrides.updatedAt = new Date().toISOString();
            config.updatedAt = new Date().toISOString();
            this.userConfigs.set(userId, config);
        });
    }

    removeOverride(userId: string, seamRole: SeamRole): void {
        this.observe('removeOverride', { 'strategysystem.userId': userId, 'strategysystem.seam': seamRole }, () => {
            const config = this.getUserConfig(userId);
            delete (config.overrides.overrides as Record<string, string>)[seamRole];
            config.overrides.updatedAt = new Date().toISOString();
            config.updatedAt = new Date().toISOString();
            this.userConfigs.set(userId, config);
        });
    }

    // Experiment management
    registerExperiment(experiment: StrategyExperiment): void {
        this.observe('registerExperiment', { 'strategysystem.profile': experiment.id }, () => {
            this.experiments.set(experiment.id, { ...experiment, updatedAt: new Date().toISOString() });
        });
    }

    getExperiment(id: string): StrategyExperiment | undefined {
        return this.observe('getExperiment', { 'strategysystem.profile': id }, () => this.experiments.get(id));
    }

    getActiveExperiments(): StrategyExperiment[] {
        return this.observe('getActiveExperiments', {}, () => 
            Array.from(this.experiments.values()).filter(e => e.isActive)
        );
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

    getOrCreateAssignment(experiment: StrategyExperiment, userId: string): ExperimentAssignment {
        const assignmentKey = `${experiment.id}:${userId}`;
        let assignment = this.assignments.get(assignmentKey);

        if (!assignment) {
            assignment = assignToVariant(experiment, userId);
            this.assignments.set(assignmentKey, assignment);
        }

        return assignment;
    }

    setAssignment(experimentId: string, userId: string, assignment: ExperimentAssignment): void {
        const key = `${experimentId}:${userId}`;
        this.assignments.set(key, assignment);
    }

    getAssignment(experimentId: string, userId: string): ExperimentAssignment | undefined {
        const key = `${experimentId}:${userId}`;
        return this.assignments.get(key);
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

// --- Resolution Strategy Registry ---

type RegistrableResolutionStrategy = ResolutionStrategy & { 
    getDefaultConfig(): ResolutionStrategyConfig; 
    validateConfig(config: ResolutionStrategyConfig): { valid: boolean; errors: string[] } 
};

const { registry: resolutionStrategyRegistry, get: getResolutionStrategyRegistry, reset: resetResolutionStrategyRegistry } = 
    createInstanceRegistry<RegistrableResolutionStrategy>('ResolutionStrategy', [
        new OverrideResolutionStrategy(),
        new ExperimentResolutionStrategy(),
        new RevisionResolutionStrategy(),
        new ManualProfileResolutionStrategy(),
        new PolicyResolutionStrategy(),
        new DefaultProfileResolutionStrategy(),
        new FallbackResolutionStrategy(),
    ]);

// --- StrategySystem ---

export class StrategySystem {
    readonly strategies = new Registry<StrategyRegistrable>({ 
        errorPrefix: 'StrategySystem',
        allowReplace: true 
    });
    readonly profiles: ProfileRegistry;
    readonly resolution = getResolutionStrategyRegistry();
    private revisionStore: ResolutionRevisionStore | null = null;
    private readonly observeOp: ReturnType<typeof withObservabilitySync<StrategySystemEventAttributes, any>>;

    constructor(options?: { revisionStore?: ResolutionRevisionStore }) {
        this.profiles = new ProfileRegistry();
        this.revisionStore = options?.revisionStore ?? null;
        
        this.observeOp = withObservabilitySync<StrategySystemEventAttributes, any>({
            observeFn: observeStrategySystem,
            operation: '',
            staticAttrs: {},
            errorKey: 'strategysystem.error',
            getSeverity: (err) => err ? EventSeverity.ERROR : EventSeverity.INFO,
            durationKey: 'strategysystem.duration.ms',
        });
    }

    private observe(operation: string, dynamicAttrs: Partial<StrategySystemEventAttributes>, fn: () => any) {
        return this.observeOp({ ...dynamicAttrs, 'strategysystem.operation': operation }, fn);
    }

    // --- Strategy Registration ---
    registerStrategy(s: StrategyRegistrable): void {
        this.observe('registerStrategy', { 'strategysystem.strategy': s.name, 'strategysystem.seam': s.seam.id }, () => {
            this.strategies.register(s);
        });
    }

    unregisterStrategy(name: string): boolean {
        return this.observe('unregisterStrategy', { 'strategysystem.strategy': name }, () => this.strategies.unregister(name));
    }

    getStrategy(name: string): StrategyRegistrable | undefined {
        return this.observe('getStrategy', { 'strategysystem.strategy': name }, () => this.strategies.get(name));
    }

    getAllStrategies(): StrategyRegistrable[] {
        return this.observe('getAllStrategies', {}, () => this.strategies.getAll());
    }

    getStrategiesForSeam(seamId: string): StrategyRegistrable[] {
        return this.observe('getStrategiesForSeam', { 'strategysystem.seam': seamId }, () => this.strategies.filter(s => s.seam.id === seamId));
    }

    getSeams(): Seam[] {
        return this.observe('getSeams', {}, () => {
            const seamMap = new Map<string, Seam>();
            for (const strategy of this.strategies.getAll()) {
                if (!seamMap.has(strategy.seam.id)) {
                    seamMap.set(strategy.seam.id, strategy.seam);
                }
            }
            return Array.from(seamMap.values());
        });
    }

    // --- Profile Management (delegated) ---
    registerProfile(profile: StrategyProfile): void {
        this.profiles.registerProfile(profile);
    }

    getProfile(id: string): StrategyProfile | undefined {
        return this.profiles.getProfile(id);
    }

    getAllProfiles(): StrategyProfile[] {
        return this.profiles.getAllProfiles();
    }

    getDefaultProfile(): StrategyProfile | undefined {
        return this.profiles.getDefaultProfile();
    }

    registerPolicy(policy: ProfilePolicy): void {
        this.profiles.registerPolicy(policy);
    }

    getPolicy(id: string): ProfilePolicy | undefined {
        return this.profiles.getPolicy(id);
    }

    getActivePolicy(): ProfilePolicy | undefined {
        return this.profiles.getActivePolicy();
    }

    getUserConfig(userId: string): UserProfileConfig {
        return this.profiles.getUserConfig(userId);
    }

    setUserConfig(config: UserProfileConfig): void {
        this.profiles.setUserConfig(config);
    }

    setActiveProfile(userId: string, profileId: string): boolean {
        return this.profiles.setActiveProfile(userId, profileId);
    }

    setManualMode(userId: string, manual: boolean): void {
        this.profiles.setManualMode(userId, manual);
    }

    setOverride(userId: string, seamRole: SeamRole, strategyId: string): void {
        this.profiles.setOverride(userId, seamRole, strategyId);
    }

    removeOverride(userId: string, seamRole: SeamRole): void {
        this.profiles.removeOverride(userId, seamRole);
    }

    registerExperiment(experiment: StrategyExperiment): void {
        this.profiles.registerExperiment(experiment);
    }

    getExperiment(id: string): StrategyExperiment | undefined {
        return this.profiles.getExperiment(id);
    }

    getActiveExperiments(): StrategyExperiment[] {
        return this.profiles.getActiveExperiments();
    }

    recordExposure(experimentId: string, userId: string): void {
        this.profiles.recordExposure(experimentId, userId);
    }

    // --- Resolution ---
    private buildResolutionContext(
        userId: string,
        seamRole: SeamRole,
        filter?: (s: any) => boolean
    ): ResolutionContext {
        const config = this.profiles.getUserConfig(userId);
        const seamId = resolveSeamId(seamRole);

        return {
            userId,
            seamRole,
            seamId,
            userConfig: config,
            profiles: this.profiles['profiles'] as Map<string, StrategyProfile>,
            policies: this.profiles['policies'] as Map<string, ProfilePolicy>,
            experiments: this.profiles['experiments'] as Map<string, StrategyExperiment>,
            assignments: this.profiles['assignments'] as Map<string, ExperimentAssignment>,
            strategyRegistry: this.strategies,
            revisionStore: this.revisionStore,
        };
    }

    /**
     * Resolve strategy for a user and seam role
     * Uses ResolutionStrategy registry with first-match semantics
     */
    async resolveStrategy<P extends object = Record<string, unknown>>(
        userId: string,
        seamRole: SeamRole,
        options?: { includeAsync?: boolean }
    ): Promise<ResolvedStrategy<P> | undefined> {
        const startTime = performance.now();
        try {
            const includeAsync = options?.includeAsync ?? !!this.revisionStore;
            const context = this.buildResolutionContext(userId, seamRole);
            
            // Use the resolution strategy registry's resolveAll for first-match semantics
            const result = await this.resolution.resolveAll<ResolutionContext, ResolvedStrategy<P>>(
                context,
                includeAsync ? undefined : (s: any) => s.name !== 'revision'
            );
            
            observeStrategySystem({
                'strategysystem.operation': 'resolveStrategy',
                'strategysystem.userId': userId,
                'strategysystem.seam': seamRole,
                'strategysystem.strategy': result?.strategyId,
                'strategysystem.duration.ms': performance.now() - startTime,
            });
            return result;
        } catch (error) {
            observeStrategySystem({
                'strategysystem.operation': 'resolveStrategy',
                'strategysystem.userId': userId,
                'strategysystem.seam': seamRole,
                'strategysystem.error': error instanceof Error ? error.message : String(error),
                'strategysystem.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
    }

    /**
     * Synchronous resolution (backward compatible, skips revision layer)
     */
    resolveStrategySync<P extends object = Record<string, unknown>>(
        userId: string,
        seamRole: SeamRole
    ): ResolvedStrategy<P> | undefined {
        const startTime = performance.now();
        try {
            const context = this.buildResolutionContext(userId, seamRole, (s: any) => s.name !== 'revision');
            
            const strategies = this.resolution.getAll()
                .filter(s => s.appliesTo(context.seamRole) && s.name !== 'revision');

            for (const strategy of strategies) {
                const result = strategy.resolve(context);
                if (result) {
                    observeStrategySystem({
                        'strategysystem.operation': 'resolveStrategySync',
                        'strategysystem.userId': userId,
                        'strategysystem.seam': seamRole,
                        'strategysystem.strategy': result.strategyId,
                        'strategysystem.duration.ms': performance.now() - startTime,
                    });
                    return result as ResolvedStrategy<P>;
                }
            }
            
            observeStrategySystem({
                'strategysystem.operation': 'resolveStrategySync',
                'strategysystem.userId': userId,
                'strategysystem.seam': seamRole,
                'strategysystem.duration.ms': performance.now() - startTime,
            });
            return undefined;
        } catch (error) {
            observeStrategySystem({
                'strategysystem.operation': 'resolveStrategySync',
                'strategysystem.userId': userId,
                'strategysystem.seam': seamRole,
                'strategysystem.error': error instanceof Error ? error.message : String(error),
                'strategysystem.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
    }

    // --- Serialization ---
    toJSON(): {
        profiles: StrategyProfile[];
        policies: ProfilePolicy[];
        userConfigs: UserProfileConfig[];
        experiments: StrategyExperiment[];
        assignments: ExperimentAssignment[];
        strategies: string[]; // strategy names
    } {
        return {
            ...this.profiles.toJSON(),
            strategies: this.strategies.listNames(),
        };
    }

    static fromJSON(data: {
        profiles: StrategyProfile[];
        policies: ProfilePolicy[];
        userConfigs: UserProfileConfig[];
        experiments: StrategyExperiment[];
        assignments: ExperimentAssignment[];
        strategies?: string[];
    }): StrategySystem {
        const system = new StrategySystem();
        
        // Restore profiles into the existing instance
        for (const profile of data.profiles) {
            system.profiles.registerProfile(profile);
        }
        for (const policy of data.policies) {
            system.profiles.registerPolicy(policy);
        }
        for (const config of data.userConfigs) {
            system.profiles.setUserConfig(config);
        }
        for (const experiment of data.experiments) {
            system.profiles.registerExperiment(experiment);
        }
        for (const assignment of data.assignments) {
            system.profiles.setAssignment(assignment.experimentId, assignment.userId, assignment);
        }
        
        // Note: strategies would need to be re-registered separately
        // since they contain executable code
        
        return system;
    }

    // --- Reset for testing ---
    reset(): void {
        this.strategies.clear();
        this.profiles.reset();
        resetResolutionStrategyRegistry();
    }

    // --- Set revision store ---
    setRevisionStore(store: RevisionStoreLike | null): void {
        this.revisionStore = store;
    }
}

// --- Singleton instance ---
let _singletonInstance: StrategySystem | null = null;

export function getStrategySystem(): StrategySystem {
    if (!_singletonInstance) {
        _singletonInstance = new StrategySystem();
    }
    return _singletonInstance;
}

export function resetStrategySystemForTesting(): void {
    if (_singletonInstance) {
        _singletonInstance.reset();
        _singletonInstance = null;
    }
}