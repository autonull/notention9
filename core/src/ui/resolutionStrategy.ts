/**
 * ResolutionStrategy Interface + Registry
 * Pluggable strategy resolution: profile-based, revision-aware, experiment-driven
 * Replaces hardcoded resolution steps in ProfileRegistry
 */

import { z } from 'zod';
import type { Strategy, SeamRole, StrategyRegistrable } from './strategy.js';
import { getStrategy, getStrategiesForSeam } from './strategy.js';

// Re-export SeamRole for sharedTypes.ts
export type { SeamRole } from './strategy.js';
import type { 
    StrategyProfile, 
    ProfilePolicy, 
    UserProfileConfig, 
    StrategyExperiment, 
    ExperimentAssignment,
    ResolutionReason,
    ResolvedStrategy 
} from './profileTypes.js';
import type { Revision } from '../telemetry/revisionStore.js';
import { assignToVariant, matchConditions, selectProfileByPolicy } from '../utils/resolutionUtils.js';
import { createInstanceRegistry, ValidationHelpers } from '../utils/Registry.js';
import { Plugin } from '../utils/BasePlugin.js';
import { Registry } from '../utils/Registry.js';

// --- ResolutionStrategy Config ---

export interface ResolutionStrategyConfig {
    // Common config
    [key: string]: unknown;
}

export interface ResolutionStrategy {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema;
    /** Optional: seam roles this strategy applies to (undefined = all) */
    readonly seamRoles?: SeamRole[];
    
    getName(): string;
    appliesTo(seamRole: SeamRole): boolean;
    resolve(
        context: ResolutionContext
    ): ResolvedStrategy | Promise<ResolvedStrategy | undefined> | undefined;
    getDefaultConfig(): ResolutionStrategyConfig;
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
    strategyRegistry: Registry<StrategyRegistrable>;
    revisionStore?: {
        getActive(seamRole: string): Promise<Revision | undefined>;
    };
}

// --- Base Resolution Strategy Plugin ---

abstract class BaseResolutionStrategyPlugin extends Plugin<ResolutionStrategyConfig> {
    abstract readonly name: string;
    abstract readonly description: string;
    readonly seamRoles?: SeamRole[];
    readonly configSchema?: z.ZodSchema<ResolutionStrategyConfig> = undefined;

    getDefaultConfig(): ResolutionStrategyConfig {
        return {};
    }

    validateConfig(_config: ResolutionStrategyConfig): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }

    appliesTo(seamRole: SeamRole): boolean {
        return this.seamRoles === undefined || this.seamRoles.includes(seamRole);
    }

    abstract resolve(context: ResolutionContext): ResolvedStrategy | Promise<ResolvedStrategy | undefined> | undefined;
}

// --- Built-in Resolution Strategies ---

/**
 * OverrideResolutionStrategy - Checks user overrides (highest priority)
 */
export class OverrideResolutionStrategy extends BaseResolutionStrategyPlugin {
    readonly name = 'override';
    readonly description = 'User strategy overrides (manual per-seam selection)';

    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { userConfig, seamRole, seamId, strategyRegistry } = context;
        const overrideId = (userConfig.overrides.overrides as Record<string, string>)[seamRole];
        const strategy = overrideId ? getStrategy(seamId, overrideId) : undefined;
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
export class ExperimentResolutionStrategy extends BaseResolutionStrategyPlugin {
    readonly name = 'experiment';
    readonly description = 'Active experiment variant assignment';

    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { userConfig, seamRole, seamId, experiments, assignments } = context;
        
        for (const experiment of experiments.values()) {
            if (!experiment.isActive || experiment.seamId !== seamRole) continue;
            
            const assignmentKey = `${experiment.id}:${userConfig.userId}`;
            let assignment = assignments.get(assignmentKey);
            
            if (!assignment) {
                assignment = assignToVariant(experiment, userConfig.userId);
                assignments.set(assignmentKey, assignment);
            }
            
            const variant = experiment.variants.find(v => v.id === assignment.variantId);
            if (variant) {
                const strategy = getStrategy(seamId, variant.strategyId);
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
}

/**
 * RevisionResolutionStrategy - Checks for active revision (NEW revision layer)
 */
export class RevisionResolutionStrategy extends BaseResolutionStrategyPlugin {
    readonly name = 'revision';
    readonly description = 'Active revision for seam role (requires consent)';

    getDefaultConfig(): ResolutionStrategyConfig {
        return { requireConsent: true };
    }

    async resolve(context: ResolutionContext): Promise<ResolvedStrategy | undefined> {
        if (!context.revisionStore) return undefined;
        
        const { seamRole, seamId } = context;
        const activeRevision = await context.revisionStore.getActive(seamRole);
        
        if (activeRevision && activeRevision.status === 'active' && activeRevision.consentedBy) {
            const strategy = getStrategy(seamId, activeRevision.strategy.id);
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
export class ManualProfileResolutionStrategy extends BaseResolutionStrategyPlugin {
    readonly name = 'manual-profile';
    readonly description = 'Manual mode with explicitly selected profile';

    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { userConfig, seamRole, seamId, profiles } = context;
        if (!userConfig.manualMode) return undefined;
        
        const profile = profiles.get(userConfig.activeProfileId);
        const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
        const strategy = strategyId ? getStrategy(seamId, strategyId) : undefined;
        
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
export class PolicyResolutionStrategy extends BaseResolutionStrategyPlugin {
    readonly name = 'policy';
    readonly description = 'Automatic profile selection via policy rules';

    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { userConfig, seamRole, seamId, profiles, policies } = context;
        const policy = Array.from(policies.values()).find(p => p.isEnabled);
        if (!policy) return undefined;
        
        const profile = selectProfileByPolicy(policy, userConfig, profiles);
        const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
        const strategy = strategyId ? getStrategy(seamId, strategyId) : undefined;
        
        if (strategy) {
            // Find which rule matched
            const sortedRules = [...policy.rules].sort((a, b) => a.priority - b.priority);
            for (const rule of sortedRules) {
                if (matchConditions(rule.conditions, userConfig, profiles)) {
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
}

/**
 * DefaultProfileResolutionStrategy - Falls back to default profile
 */
export class DefaultProfileResolutionStrategy extends BaseResolutionStrategyPlugin {
    readonly name = 'default-profile';
    readonly description = 'Default profile fallback';

    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { seamRole, seamId, profiles } = context;
        const defaultProfile = Array.from(profiles.values()).find(p => p.isDefault) ?? Array.from(profiles.values())[0];
        const strategyId = (defaultProfile?.strategySelections as Record<string, string>)[seamRole];
        const strategy = strategyId ? getStrategy(seamId, strategyId) : undefined;
        
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
export class FallbackResolutionStrategy extends BaseResolutionStrategyPlugin {
    readonly name = 'fallback';
    readonly description = 'Last resort: first available strategy for seam';

    resolve(context: ResolutionContext): ResolvedStrategy | undefined {
        const { seamRole, seamId } = context;
        const seamStrategies = getStrategiesForSeam(seamId);
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

// --- ResolutionStrategy Registrable mixin ---
type RegistrableResolutionStrategy = ResolutionStrategy & { getDefaultConfig(): ResolutionStrategyConfig; validateConfig(config: ResolutionStrategyConfig): { valid: boolean; errors: string[] } };

// --- ResolutionStrategy Registry ---

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

// --- Singleton instance ---
export { resolutionStrategyRegistry, getResolutionStrategyRegistry, resetResolutionStrategyRegistry };

// --- Re-export types ---
export type { 
    ResolutionReason, 
    ResolvedStrategy 
} from './profileTypes.js';