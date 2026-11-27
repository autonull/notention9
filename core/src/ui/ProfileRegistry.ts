/**
 * Profile Registry - Node.js Implementation
 * Extends shared base with Node.js-specific functionality
 */

import { getRevisionStore } from '../telemetry/revisionStore.js';
import { BaseProfileRegistry, type ResolvedStrategy } from './ProfileRegistry.base.js';
import type { StrategyRegistrable, SeamRole } from './strategy.js';
import { Registry } from '../utils/Registry.js';
import { DEFAULT_PROFILES, DEFAULT_POLICY, DEFAULT_MATCH_DISPLAY_EXPERIMENT } from './profileDefaults.js';

// Re-export all types and constants from base and related modules
export * from './ProfileRegistry.base.js';
export * from './profileTypes.js';
export * from './profileDefaults.js';
export { SEAM_ROLES } from '../constants/seams.js';
export { type SeamRole } from './strategy.js';

/**
 * Node.js Profile Registry with revision store support
 */
export class ProfileRegistry extends BaseProfileRegistry {
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

    // Reset registry for testing
    override reset(): void {
        this.profiles.clear();
        this.policies.clear();
        this.userConfigs.clear();
        this.experiments.clear();
        this.assignments.clear();

        // Re-register defaults
        for (const profile of DEFAULT_PROFILES) {
            this.profiles.set(profile.id, profile);
        }
        this.policies.set(DEFAULT_POLICY.id, DEFAULT_POLICY);
        this.experiments.set(DEFAULT_MATCH_DISPLAY_EXPERIMENT.id, DEFAULT_MATCH_DISPLAY_EXPERIMENT);
    }
}

// Singleton instance
export const profileRegistry = new ProfileRegistry();