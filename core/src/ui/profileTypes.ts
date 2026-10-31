/**
 * Strategy profile types
 * Single source of truth for profile-related types
 */

import type { SeamRole } from '../constants/seams.js';

/**
 * Strategy profile - a named collection of strategy selections per seam role
 */
export interface StrategyProfile {
    id: string;
    name: string;
    description: string;
    // seamRole -> strategyId mapping (uses stable roles, not dynamic seam IDs)
    strategySelections: Partial<Record<SeamRole, string>>;
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
    // seamRole -> strategyId (overrides profile selection)
    overrides: Partial<Record<SeamRole, string>>;
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
    seamId: SeamRole;
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
    seamId: SeamRole;
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