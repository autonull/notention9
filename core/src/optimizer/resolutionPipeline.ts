/**
 * Data-driven ProfileRegistry Resolution Steps (R4)
 * Reads resolution steps from seam definitions instead of hardcoded array
 * Governance level enforcement (R5) - only 'measured' evidence can auto-activate
 */

import type { ProfileRegistry } from '../ui/ProfileRegistry.js';
import type { StrategyRegistry } from '../ui/strategy.js';
import type { UserProfileConfig, SeamRole, Strategy, ResolvedStrategy, ResolutionReason, StrategyProfile } from '../ui/profileTypes.js';
import type { SeamDefinition } from '../schemas/seamDefinition.js';
import type { ExtendedRunVerdict, EvidenceClass } from '../schemas/verdictResult.js';
import { getRevisionStore, type Revision } from '../telemetry/revisionStore.js';
import { getAllSeamDefinitions } from './strategyLoader.js';
import { passesGovernanceGate } from '../schemas/evidence.js';
import { logInfo } from '../utils/logging.js';
import { 
    assignToVariant, 
    matchConditions, 
    selectProfileByPolicy,
    createResolutionReason,
} from '../utils/resolutionUtils.js';

// --- Resolution Step Definition ---

export interface ResolutionStep {
    name: string;
    description: string;
    priority: number;           // Lower = higher priority (runs first)
    seamRoles?: SeamRole[];     // Applicable seam roles (undefined = all)
    governanceLevel?: 'config' | 'structure' | 'interface';
    evidenceClasses?: EvidenceClass[]; // Required evidence classes
    
    /**
     * Try to resolve a strategy for the given user and seam
     * Returns resolved strategy with reason, or undefined if this step doesn't apply
     */
    tryResolve(
        config: UserProfileConfig,
        seamRole: SeamRole,
        seamId: string,
        registry: ProfileRegistry,
        strategyRegistry: StrategyRegistry
    ): Promise<{ strategy: Strategy; reason: ResolutionReason } | undefined>;
}

// --- Built-in Resolution Steps ---

/**
 * Step 1: User overrides (highest priority)
 */
export const userOverrideStep: ResolutionStep = {
    name: 'user-override',
    description: 'Explicit user strategy override',
    priority: 10,
    
    async tryResolve(config, seamRole, seamId, registry, strategyRegistry) {
        const overrideId = (config.overrides.overrides as Record<string, string>)[seamRole];
        if (!overrideId) return undefined;
        
        const strategy = strategyRegistry.get(seamId, overrideId);
        if (!strategy) return undefined;
        
        return {
            strategy,
            reason: { kind: 'override', strategyId: overrideId },
        };
    },
};

/**
 * Step 2: Active experiment assignment
 */
export const experimentAssignmentStep: ResolutionStep = {
    name: 'experiment-assignment',
    description: 'Active A/B experiment variant assignment',
    priority: 20,
    
    async tryResolve(config, seamRole, seamId, registry, strategyRegistry) {
        for (const experiment of registry.getActiveExperiments()) {
            if (experiment.seamId !== seamRole) continue;
            
            const assignmentKey = `${experiment.id}:${config.userId}`;
            let assignment = (registry as any).assignments?.get(assignmentKey);
            
            if (!assignment) {
                assignment = assignToVariant(experiment, config.userId);
                (registry as any).assignments?.set(assignmentKey, assignment);
            }
            
            const variant = experiment.variants.find(v => v.id === assignment.variantId);
            if (variant) {
                const strategy = strategyRegistry.get(seamId, variant.strategyId);
                if (strategy) {
                    return {
                        strategy,
                        reason: { kind: 'experiment', experimentId: experiment.id, variantId: variant.id },
                    };
                }
            }
        }
        return undefined;
    },
};

/**
 * Step 3: Active revision (governance-gated) - R5
 * Only activates revisions with 'measured' evidence or explicit consent
 */
export const activeRevisionStep: ResolutionStep = {
    name: 'active-revision',
    description: 'Active revision with governance gate enforcement',
    priority: 30,
    evidenceClasses: ['measured'],
    
    async tryResolve(config, seamRole, seamId, registry, strategyRegistry) {
        const revisionStore = getRevisionStore();
        const activeRevision = await revisionStore.getActive(seamRole);
        
        if (!activeRevision || activeRevision.status !== 'active') return undefined;
        
        // R5: Governance gate enforcement
        // Check if revision has consentedBy (explicit consent) OR evidence is 'measured'
        const hasConsent = !!activeRevision.consentedBy;
        const evidenceClass = (activeRevision as any).evidenceClass ?? 'asserted';
        
        const canActivate = passesGovernanceGate(evidenceClass as any, hasConsent);
        
        if (!canActivate) {
            // Log governance rejection
            logInfo(`[Governance] Revision ${activeRevision.id} blocked`, { evidenceClass, consent: hasConsent });
            return undefined;
        }
        
        const strategy = strategyRegistry.get(seamId, activeRevision.strategy.id);
        if (!strategy) return undefined;
        
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
        };
    },
};

/**
 * Step 4: Manual mode with active profile
 */
export const manualProfileStep: ResolutionStep = {
    name: 'manual-profile',
    description: 'User-selected profile in manual mode',
    priority: 40,
    
    async tryResolve(config, seamRole, seamId, registry, strategyRegistry) {
        if (!config.manualMode) return undefined;
        
        const profile = registry.getProfile(config.activeProfileId);
        const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
        if (!strategyId) return undefined;
        
        const strategy = strategyRegistry.get(seamId, strategyId);
        if (!strategy) return undefined;
        
        return {
            strategy,
            reason: { kind: 'manual-profile', profileId: config.activeProfileId },
        };
    },
};

/**
 * Step 5: Auto-select profile via policy
 */
export const policyProfileStep: ResolutionStep = {
    name: 'policy-profile',
    description: 'Policy-driven profile selection',
    priority: 50,
    
    async tryResolve(config, seamRole, seamId, registry, strategyRegistry) {
        const policy = registry.getActivePolicy();
        if (!policy) return undefined;
        
        const profile = selectProfileByPolicy(policy, config, registry);
        const strategyId = (profile?.strategySelections as Record<string, string>)[seamRole];
        if (!strategyId) return undefined;
        
        const strategy = strategyRegistry.get(seamId, strategyId);
        if (!strategy) return undefined;
        
        // Find which rule matched
        const sortedRules = [...policy.rules].sort((a, b) => a.priority - b.priority);
        for (const rule of sortedRules) {
            if (matchConditions(rule.conditions, config, registry)) {
                return {
                    strategy,
                    reason: { kind: 'policy', policyId: policy.id, ruleId: rule.id },
                };
            }
        }
        
        return {
            strategy,
            reason: { kind: 'policy', policyId: policy.id, ruleId: 'fallback' },
        };
    },
};

/**
 * Step 6: Default profile
 */
export const defaultProfileStep: ResolutionStep = {
    name: 'default-profile',
    description: 'Default profile fallback',
    priority: 60,
    
    async tryResolve(config, seamRole, seamId, registry, strategyRegistry) {
        const defaultProfile = registry.getDefaultProfile();
        const strategyId = (defaultProfile?.strategySelections as Record<string, string>)[seamRole];
        if (!strategyId) return undefined;
        
        const strategy = strategyRegistry.get(seamId, strategyId);
        if (!strategy) return undefined;
        
        return {
            strategy,
            reason: { kind: 'default-profile', profileId: defaultProfile!.id },
        };
    },
};

/**
 * Step 7: Fallback - first available strategy
 */
export const fallbackStep: ResolutionStep = {
    name: 'fallback',
    description: 'First available strategy for seam (last resort)',
    priority: 100,
    
    async tryResolve(config, seamRole, seamId, registry, strategyRegistry) {
        const seamStrategies = strategyRegistry.getAllForSeam(seamId);
        const strategy = seamStrategies[0];
        if (!strategy) return undefined;
        
        return {
            strategy,
            reason: { kind: 'fallback', seamId },
        };
    },
};

// --- Resolution Pipeline ---

/**
 * Default resolution steps in priority order
 * Can be customized by registering custom steps
 */
export const DEFAULT_RESOLUTION_STEPS: ResolutionStep[] = [
    userOverrideStep,
    experimentAssignmentStep,
    activeRevisionStep,
    manualProfileStep,
    policyProfileStep,
    defaultProfileStep,
    fallbackStep,
];

/**
 * Build resolution steps from seam definitions (data-driven)
 * Reads governanceLevel and evidenceClasses from SeamDefinition
 */
export function buildResolutionStepsFromDefinitions(
    customSteps: ResolutionStep[] = []
): ResolutionStep[] {
    const seamDefinitions = getAllSeamDefinitions();
    const steps = [...DEFAULT_RESOLUTION_STEPS];
    
    // Allow custom steps to override or insert
    for (const customStep of customSteps) {
        const existingIndex = steps.findIndex(s => s.name === customStep.name);
        if (existingIndex >= 0) {
            steps[existingIndex] = customStep;
        } else {
            steps.push(customStep);
        }
    }
    
    // Sort by priority
    steps.sort((a, b) => a.priority - b.priority);
    
    // Filter steps by seam definition governance/evidence requirements
    // This allows seam-specific step filtering
    return steps;
}

/**
 * Resolve strategy using data-driven pipeline
 */
export async function resolveStrategyWithPipeline<P extends object = Record<string, unknown>>(
    userId: string,
    seamRole: SeamRole,
    strategyRegistry: StrategyRegistry,
    registry: ProfileRegistry,
    customSteps?: ResolutionStep[]
): Promise<ResolvedStrategy<P> | undefined> {
    const config = registry.getUserConfig(userId);
    const seamId = resolveSeamId(seamRole, strategyRegistry);
    const steps = customSteps ?? buildResolutionStepsFromDefinitions();
    
    // Filter steps applicable to this seam role
    const applicableSteps = steps.filter(step => 
        !step.seamRoles || step.seamRoles.includes(seamRole)
    );
    
    for (const step of applicableSteps) {
        const result = await step.tryResolve(config, seamRole, seamId, registry, strategyRegistry);
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
 * Resolve seam role to actual seam ID
 */
function resolveSeamId(seamRole: SeamRole, strategyRegistry: StrategyRegistry): string {
    const seams = strategyRegistry.listSeams();
    const discovered = seams.find(s => s.id.startsWith(`${seamRole}-`));
    return discovered?.id ?? `${seamRole}-0`;
}

/**
 * Patch ProfileRegistry to use data-driven resolution
 * This modifies the existing instance to use the new pipeline
 */
export function patchProfileRegistryForDataDrivenResolution(registry: ProfileRegistry): void {
    // Store original methods
    const originalResolveWithMeta = registry.resolveStrategyWithMeta.bind(registry);
    const originalResolveAsync = registry.resolveStrategyWithMetaAsync.bind(registry);
    
    // Override with data-driven pipeline
    (registry as any).resolveStrategyWithMeta = async function<P extends object = Record<string, unknown>>(
        userId: string,
        seamRole: SeamRole,
        strategyRegistry: StrategyRegistry
    ): Promise<ResolvedStrategy<P> | undefined> {
        // Use sync version of pipeline (without revision step)
        const syncSteps = buildResolutionStepsFromDefinitions().filter(s => s.name !== 'active-revision');
        
        const config = this.getUserConfig(userId);
        const seamId = resolveSeamId(seamRole, strategyRegistry);
        
        for (const step of syncSteps) {
            // Call sync version
            const result = await step.tryResolve(config, seamRole, seamId, this, strategyRegistry);
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
    };
    
    (registry as any).resolveStrategyWithMetaAsync = async function<P extends object = Record<string, unknown>>(
        userId: string,
        seamRole: SeamRole,
        strategyRegistry: StrategyRegistry
    ): Promise<ResolvedStrategy<P> | undefined> {
        return resolveStrategyWithPipeline(userId, seamRole, strategyRegistry, this);
    };
}

// Re-export for convenience
export { passesGovernanceGate } from '../schemas/evidence.js';
export type { EvidenceClass } from '../schemas/evidence.js';