/**
 * Profile Registry - Browser Implementation
 * Extends shared base with browser-safe stub for revision store
 */

// Browser stub - throws error if used
import { getRevisionStore } from '../telemetry/revisionStore.browser.js';
import { BaseProfileRegistry, type ResolvedStrategy } from './ProfileRegistry.base.js';
import type { StrategyRegistrable, SeamRole } from './strategy.js';
import { Registry } from '../utils/Registry.js';

// Re-export all types and constants from base and related modules
export * from './ProfileRegistry.base.js';
export * from './profileTypes.js';
export * from './profileDefaults.js';
export { SEAM_ROLES } from '../constants/seams.js';
export { type SeamRole } from './strategy.js';

/**
 * Browser Profile Registry with browser-safe revision store stub
 */
export class ProfileRegistry extends BaseProfileRegistry {
    /**
     * Async resolve with full revision layer support
     * Includes active revision check between experiment and manual profile layers
     * In browser, this uses the stub which throws if called
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
}

// Singleton instance
export const profileRegistry = new ProfileRegistry();