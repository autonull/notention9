/**
 * Shared Resolution Utilities
 * Eliminates duplication of assignToVariant, matchConditions, resolveSeamId
 * across ProfileRegistry and resolutionStrategy
 */

import type { StrategyExperiment, ExperimentAssignment, ProfilePolicy, UserProfileConfig, SeamRole } from '../ui/profileTypes.js';
import type { ProfileRegistry } from '../ui/ProfileRegistry.js';

/**
 * Assign user to experiment variant using weighted random selection
 */
export function assignToVariant(experiment: StrategyExperiment, userId: string): ExperimentAssignment {
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

/**
 * Match policy conditions against user context
 */
export function matchConditions(
    conditions: Record<string, unknown>,
    config: UserProfileConfig,
    profiles: Map<string, any> | ProfileRegistry
): boolean {
    const activeProfile = 'getProfile' in profiles
        ? profiles.getProfile(config.activeProfileId)
        : profiles.get(config.activeProfileId);
    const context = activeProfile?.context ?? {};

    for (const [key, value] of Object.entries(conditions)) {
        if (context[key] !== value) {
            return false;
        }
    }
    return true;
}

/**
 * Select profile by policy rules (priority order)
 */
export function selectProfileByPolicy(
    policy: ProfilePolicy,
    config: UserProfileConfig,
    profiles: Map<string, any> | ProfileRegistry
): any | undefined {
    const sortedRules = [...policy.rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
        if (matchConditions(rule.conditions, config, profiles)) {
            return 'getProfile' in profiles
                ? profiles.getProfile(rule.profileId)
                : profiles.get(rule.profileId);
        }
    }

    return 'getProfile' in profiles
        ? profiles.getProfile(policy.fallbackProfileId)
        : profiles.get(policy.fallbackProfileId);
}

/**
 * Build resolution reason object
 */
export function createResolutionReason(
    kind: 'override' | 'experiment' | 'revision' | 'manual-profile' | 'policy' | 'default-profile' | 'fallback',
    details: Record<string, unknown>
): { kind: string } & Record<string, unknown> {
    return { kind, ...details };
}