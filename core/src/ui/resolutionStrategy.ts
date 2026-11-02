/**
 * ResolutionStrategy Interface + Registry
 * Pluggable strategy resolution: profile-based, revision-aware, experiment-driven
 * Replaces hardcoded resolution steps in ProfileRegistry
 */

import { z } from 'zod';
import type { Strategy, SeamRole } from './strategy.js';
import type { 
    StrategyProfile, 
    ProfilePolicy, 
    UserProfileConfig, 
    StrategyExperiment, 
    ExperimentAssignment,
    ResolutionReason,
    ResolvedStrategy 
} from './profileTypes.js';
import type { StrategyRegistry } from './strategy.js';
import type { Revision } from '../telemetry/revisionStore.js';

// --- ResolutionStrategy Config ---

export interface ResolutionStrategyConfig {
    // Common config
    [key: string]: unknown;
}

export interface ResolutionStrategy {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema;
    
    /**
     * Get the strategy name
     */
    getName(): string;
    
    /**
     * Resolve a strategy for a user and seam role
     * @returns ResolvedStrategy with full provenance, or undefined if cannot resolve
     */
    resolve(
        context: ResolutionContext
    ): ResolvedStrategy | Promise<ResolvedStrategy | undefined>;
    
    /**
     * Get default configuration for this strategy
     */
    getDefaultConfig(): ResolutionStrategyConfig;
    
    /**
     * Validate configuration
     */
    validateConfig(config: ResolutionStrategyConfig): { valid: boolean; errors: string[] };
}

// --- Resolution Context ---

export interface ResolutionContext {
    userId: string;
    seamRole: SeamRole;
    seamId: string;
    userConfig: UserProfileConfig;
    profiles: Map<string, StrategyProfile>;
    policies: Map<string, ProfilePolicy>;
    experiments: Map<string, StrategyExperiment>;
    assignments: Map<string, ExperimentAssignment>;
    strategyRegistry: StrategyRegistry;
    revisionStore?: {
        getActive(seamRole: string): Promise<Revision | undefined>;
    };
}

// --- Built-in Resolution Strategies ---

/**
 * OverrideResolutionStrategy - Checks user overrides (highest priority)
 */
export class OverrideResolutionStrategy implements ResolutionStrategy {
    readonly name = 'override';
    readonly description = 'User strategy overrides (manual per-seam selection)';
    
    getName(): string {
        return this.name;
    }
    
    getDefaultConfig(): ResolutionStrategyConfig {
        return {};
    }
    
    validateConfig(_config: ResolutionStrategyConfig): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }
    
    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { userConfig, seamRole, seamId, strategyRegistry } = context;
        const overrideId = (userConfig.overrides.overrides as Record<string, string>)[seamRole];
        const strategy = overrideId ? strategyRegistry.get(seamId, overrideId) : undefined;
        return strategy ? { 
            strategy, 
            reason: { kind: 'override', strategyId: overrideId },
            resolvedParams: strategy.getDefaultProps() as ResolvedStrategy['resolvedParams'],
            resolvedAt: new Date().toISOString(),
            userId: context.userId,
            seamRole,
        } : undefined;
    }
}

/**
 * ExperimentResolutionStrategy - Checks active experiment assignments
 */
export class ExperimentResolutionStrategy implements ResolutionStrategy {
    readonly name = 'experiment';
    readonly description = 'Active experiment variant assignment';
    
    getName(): string {
        return this.name;
    }
    
    getDefaultConfig(): ResolutionStrategyConfig {
        return {};
    }
    
    validateConfig(_config: ResolutionStrategyConfig): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }
    
    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { userConfig, seamRole, seamId, experiments, assignments, strategyRegistry } = context;
        
        for (const experiment of experiments.values()) {
            if (!experiment.isActive || experiment.seamId !== seamRole) continue;
            
            const assignmentKey = `${experiment.id}:${userConfig.userId}`;
            let assignment = assignments.get(assignmentKey);
            
            if (!assignment) {
                assignment = this.assignToVariant(experiment, userConfig.userId);
                assignments.set(assignmentKey, assignment);
            }
            
            const variant = experiment.variants.find(v => v.id === assignment.variantId);
            if (variant) {
                const strategy = strategyRegistry.get(seamId, variant.strategyId);
                if (strategy) {
                    return { 
                        strategy, 
                        reason: { kind: 'experiment', experimentId: experiment.id, variantId: variant.id },
                        resolvedParams: strategy.getDefaultProps() as ResolvedStrategy['resolvedParams'],
                        resolvedAt: new Date().toISOString(),
                        userId: context.userId,
                        seamRole,
                    };
                }
            }
        }
        return undefined;
    }
    
    private assignToVariant(experiment: StrategyExperiment, userId: string): ExperimentAssignment {
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
        
        return {
            experimentId: experiment.id,
            userId,
            variantId: experiment.variants[0].id,
            assignedAt: new Date().toISOString(),
            exposureCount: 0,
            lastExposureAt: new Date().toISOString(),
        };
    }
}

/**
 * RevisionResolutionStrategy - Checks for active revision (NEW revision layer)
 */
export class RevisionResolutionStrategy implements ResolutionStrategy {
    readonly name = 'revision';
    readonly description = 'Active revision for seam role (requires consent)';
    
    getName(): string {
        return this.name;
    }
    
    getDefaultConfig(): ResolutionStrategyConfig {
        return { requireConsent: true };
    }
    
    validateConfig(config: ResolutionStrategyConfig): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }
    
    async resolve(context: ResolutionContext): Promise<ResolvedStrategy | undefined> {
        if (!context.revisionStore) return undefined;
        
        const { seamRole, seamId, strategyRegistry } = context;
        const activeRevision = await context.revisionStore.getActive(seamRole);
        
        if (activeRevision && activeRevision.status === 'active' && activeRevision.consentedBy) {
            const strategy = strategyRegistry.get(seamId, activeRevision.strategy.id);
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
                    reason: { kind: 'revision', revisionId: activeRevision.id, seamRole },
                    resolvedParams: mergedParams as ResolvedStrategy['resolvedParams'],
                    resolvedAt: new Date().toISOString(),
                    userId: context.userId,
                    seamRole,
                };
            }
        }
        return undefined;
    }
}

/**
 * ManualProfileResolutionStrategy - Manual mode with active profile
 */
export class ManualProfileResolutionStrategy implements ResolutionStrategy {
    readonly name = 'manual-profile';
    readonly description = 'Manual mode with explicitly selected profile';
    
    getName(): string {
        return this.name;
    }
    
    getDefaultConfig(): ResolutionStrategyConfig {
        return {};
    }
    
    validateConfig(_config: ResolutionStrategyConfig): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }
    
    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { userConfig, seamRole, seamId, profiles, strategyRegistry } = context;
        if (!userConfig.manualMode) return undefined;
        
        const profile = profiles.get(userConfig.activeProfileId);
        const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
        const strategy = strategyId ? strategyRegistry.get(seamId, strategyId) : undefined;
        
        return strategy ? { 
            strategy, 
            reason: { kind: 'manual-profile', profileId: userConfig.activeProfileId },
            resolvedParams: strategy.getDefaultProps() as ResolvedStrategy['resolvedParams'],
            resolvedAt: new Date().toISOString(),
            userId: context.userId,
            seamRole,
        } : undefined;
    }
}

/**
 * PolicyResolutionStrategy - Auto-select profile via policy
 */
export class PolicyResolutionStrategy implements ResolutionStrategy {
    readonly name = 'policy';
    readonly description = 'Automatic profile selection via policy rules';
    
    getName(): string {
        return this.name;
    }
    
    getDefaultConfig(): ResolutionStrategyConfig {
        return {};
    }
    
    validateConfig(_config: ResolutionStrategyConfig): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }
    
    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { userConfig, seamRole, seamId, profiles, policies, strategyRegistry } = context;
        const policy = Array.from(policies.values()).find(p => p.isEnabled);
        if (!policy) return undefined;
        
        const profile = this.selectProfileByPolicy(policy, userConfig, profiles);
        const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
        const strategy = strategyId ? strategyRegistry.get(seamId, strategyId) : undefined;
        
        if (strategy) {
            // Find which rule matched
            const sortedRules = [...policy.rules].sort((a, b) => a.priority - b.priority);
            for (const rule of sortedRules) {
                if (this.matchConditions(rule.conditions, userConfig, profiles)) {
                    return { 
                        strategy, 
                        reason: { kind: 'policy', policyId: policy.id, ruleId: rule.id },
                        resolvedParams: strategy.getDefaultProps() as ResolvedStrategy['resolvedParams'],
                        resolvedAt: new Date().toISOString(),
                        userId: context.userId,
                        seamRole,
                    };
                }
            }
            return { 
                strategy, 
                reason: { kind: 'policy', policyId: policy.id, ruleId: 'fallback' },
                resolvedParams: strategy.getDefaultProps() as ResolvedStrategy['resolvedParams'],
                resolvedAt: new Date().toISOString(),
                userId: context.userId,
                seamRole,
            };
        }
        return undefined;
    }
    
    private selectProfileByPolicy(policy: ProfilePolicy, config: UserProfileConfig, profiles: Map<string, StrategyProfile>): StrategyProfile | undefined {
        const sortedRules = [...policy.rules].sort((a, b) => a.priority - b.priority);
        
        for (const rule of sortedRules) {
            if (this.matchConditions(rule.conditions, config, profiles)) {
                return profiles.get(rule.profileId);
            }
        }
        
        return profiles.get(policy.fallbackProfileId);
    }
    
    private matchConditions(conditions: Record<string, unknown>, config: UserProfileConfig, profiles: Map<string, StrategyProfile>): boolean {
        const activeProfile = profiles.get(config.activeProfileId);
        const context = activeProfile?.context ?? {};
        
        for (const [key, value] of Object.entries(conditions)) {
            if (context[key] !== value) {
                return false;
            }
        }
        return true;
    }
}

/**
 * DefaultProfileResolutionStrategy - Falls back to default profile
 */
export class DefaultProfileResolutionStrategy implements ResolutionStrategy {
    readonly name = 'default-profile';
    readonly description = 'Default profile fallback';
    
    getName(): string {
        return this.name;
    }
    
    getDefaultConfig(): ResolutionStrategyConfig {
        return {};
    }
    
    validateConfig(_config: ResolutionStrategyConfig): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }
    
    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { seamRole, seamId, profiles, strategyRegistry } = context;
        const defaultProfile = Array.from(profiles.values()).find(p => p.isDefault) ?? Array.from(profiles.values())[0];
        const strategyId = (defaultProfile?.strategySelections as Record<string, string>)[seamRole];
        const strategy = strategyId ? strategyRegistry.get(seamId, strategyId) : undefined;
        
        return strategy ? { 
            strategy, 
            reason: { kind: 'default-profile', profileId: defaultProfile!.id },
            resolvedParams: strategy.getDefaultProps() as ResolvedStrategy['resolvedParams'],
            resolvedAt: new Date().toISOString(),
            userId: context.userId,
            seamRole,
        } : undefined;
    }
}

/**
 * FallbackResolutionStrategy - Last resort: first available strategy for seam
 */
export class FallbackResolutionStrategy implements ResolutionStrategy {
    readonly name = 'fallback';
    readonly description = 'Last resort: first available strategy for seam';
    
    getName(): string {
        return this.name;
    }
    
    getDefaultConfig(): ResolutionStrategyConfig {
        return {};
    }
    
    validateConfig(_config: ResolutionStrategyConfig): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }
    
    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { seamRole, seamId, strategyRegistry } = context;
        const seamStrategies = strategyRegistry.getAllForSeam(seamId);
        const strategy = seamStrategies[0];
        
        return strategy ? { 
            strategy, 
            reason: { kind: 'fallback', seamId },
            resolvedParams: strategy.getDefaultProps() as ResolvedStrategy['resolvedParams'],
            resolvedAt: new Date().toISOString(),
            userId: context.userId,
            seamRole,
        } : undefined;
    }
}

// --- ResolutionStrategy Registry ---

export class ResolutionStrategyRegistry {
    private strategies = new Map<string, ResolutionStrategy>();
    
    constructor() {
        // Register built-in strategies in priority order (first = highest priority)
        this.register(new OverrideResolutionStrategy());
        this.register(new ExperimentResolutionStrategy());
        this.register(new RevisionResolutionStrategy());
        this.register(new ManualProfileResolutionStrategy());
        this.register(new PolicyResolutionStrategy());
        this.register(new DefaultProfileResolutionStrategy());
        this.register(new FallbackResolutionStrategy());
    }
    
    register(strategy: ResolutionStrategy): void {
        if (this.strategies.has(strategy.name)) {
            throw new Error(`ResolutionStrategy '${strategy.name}' already registered`);
        }
        this.strategies.set(strategy.name, strategy);
    }
    
    unregister(name: string): boolean {
        return this.strategies.delete(name);
    }
    
    get(name: string): ResolutionStrategy | undefined {
        return this.strategies.get(name);
    }
    
    getAll(): ResolutionStrategy[] {
        return Array.from(this.strategies.values());
    }
    
    listNames(): string[] {
        return Array.from(this.strategies.keys());
    }
    
    has(name: string): boolean {
        return this.strategies.has(name);
    }
    
    /**
     * Run all resolution strategies in priority order
     */
    async resolveAll(context: ResolutionContext): Promise<ResolvedStrategy | undefined> {
        for (const strategy of this.getAll()) {
            const result = await strategy.resolve(context);
            if (result) return result;
        }
        return undefined;
    }
}

// --- Singleton instance ---

let resolutionStrategyRegistryInstance: ResolutionStrategyRegistry | null = null;

export function getResolutionStrategyRegistry(): ResolutionStrategyRegistry {
    if (!resolutionStrategyRegistryInstance) {
        resolutionStrategyRegistryInstance = new ResolutionStrategyRegistry();
    }
    return resolutionStrategyRegistryInstance;
}

export function resetResolutionStrategyRegistry(): void {
    resolutionStrategyRegistryInstance = null;
}

// --- Re-export types ---
export type { 
    ResolutionReason, 
    ResolvedStrategy 
} from './profileTypes.js';