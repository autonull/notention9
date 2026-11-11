/**
 * Strategy resolver initialization
 * Handles component loading, seam registration, and strategy registration
 * Uses generated seam-definitions.ts as single source of truth.
 */

import type { Seam, Strategy, ParamSpec } from '@notention/core/ui/strategy';
import { strategyRegistry, createComponentStrategy, getStrategiesForSeam, getStrategy } from '@notention/core/ui/strategy';
import { resolveSeamId, SEAM_ROLES, type SeamRole } from '@notention/core/constants/seams';
import { profileRegistry } from '@notention/core/ui/ProfileRegistry';
import { STRATEGY_CONFIGS_UI } from '../strategies/strategyConfigs';
import { componentMap } from '../strategies/componentMap';

// Eagerly import all strategy components to avoid React 19 hydration error #525
// from lazy-loaded chunks in production build
import { QuickCapture } from '../components/dashboard/QuickCapture';
import { PropertyForm } from '../components/editor/PropertyForm';
import { DescribeItComposer } from '../components/editor/DescribeItComposer';
import { TemplateSelector } from '../components/editor/TemplateSelector';
import { TagInput } from '../components/editor/TagInput';
import { LocalMatchPreview } from '../components/dashboard/LocalMatchPreview';
import { DashboardLocalMatch } from '../components/dashboard/DashboardLocalMatch';
import { LocalMatchesPanel } from '../components/assistant/LocalMatchesPanel';

// Use STRATEGY_CONFIGS_UI directly (synchronous, no async loading)
const getAllStrategyConfigs = (): typeof STRATEGY_CONFIGS_UI => STRATEGY_CONFIGS_UI;
import { SEAM_DEFINITIONS } from '@notention/core/schemas/generated/seam-definitions';

// Forward declarations for component types
type QuickCaptureComponent = React.ComponentType<{
    input: string;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    extractedProps: Array<{ key: string; values: string[] }>;
    onTemplateClick: (type: string) => void;
}>;

type InsertPropertyModalComponent = React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
    onInsert: (key: string, operator: string, value: string, icon?: string) => void;
    initialKey?: string;
    initialOperator?: string;
    initialValue?: string;
    attributeDef?: any;
    ontology?: any[];
    isEditing?: boolean;
    onPickLocation?: () => Promise<string>;
    suggestions?: any[];
}>;

type LocalMatchPreviewComponent = React.ComponentType<{
    match: any;
    onSelectNote: (noteId: string) => void;
    onRejectMatch: (matchId: string) => void;
    onReviseRequest: () => void;
}>;

type DashboardLocalMatchComponent = React.ComponentType<{
    notes: any[];
    onSelectNote: (noteId: string) => void;
}>;

type LocalMatchesPanelComponent = React.ComponentType<{
    localMatches: any[];
    contacts: any[];
    onSelect: (match: any) => void;
}>;

type PropertyPanelComponent = React.ComponentType<{
    properties: any[];
    isAddingProperty: boolean;
    setIsAddingProperty: (adding: boolean) => void;
    editingPropertyIndex: number | null;
    setEditingPropertyIndex: (index: number | null) => void;
    propertyToDelete: any | null;
    setPropertyToDelete: (prop: any | null) => void;
    onSaveProperty: (key: string, op: string, value: string) => void;
    onCancelEdit: () => void;
    onAcceptReview: (item: any) => void;
    propertyReview: any | null;
    onDeleteProperty: () => void;
    onPickLocation?: () => void;
    onPickTime?: (key: string) => void;
    ontology?: any[];
}>;

// Check if running in clean-profile mode (for stranger testing)
const isCleanProfile =
    typeof window !== 'undefined' &&
    (window.location.search.includes('clean=true') || localStorage.getItem('notention:clean-profile') === 'true');

if (isCleanProfile) {
    localStorage.removeItem('notention:clean-profile');
}

export async function registerUIStrategies(): Promise<void> {
    // Register all seams from generated definitions with their actual IDs
    for (const def of SEAM_DEFINITIONS) {
        const role = def.role as SeamRole;
        const seam: Seam = {
            id: def.id,
            name: def.name,
            description: def.description,
            role,
            components: def.components,
            propsShape: def.propsShape,
        };
        // Create a minimal strategy for seam registration (placeholder component)
        const seamStrategy = createComponentStrategy(
            `seam-${def.id}`,
            seam,
            () => null,
            '1.0.0',
            {},
            {}
        );
        if (!strategyRegistry.has(seamStrategy.name)) {
            strategyRegistry.register(seamStrategy);
        }
    }

    // Map of strategy ID to custom strategy component (not Strategy wrapper)
    // Using statically imported components to avoid React 19 hydration error #525
    const strategyImplMap: Record<string, React.ComponentType<any>> = {
        'describe-it-composer': DescribeItComposer,
        'tag-input': TagInput,
        'property-form': PropertyForm,
        'template-selector': TemplateSelector,
        'quick-capture': QuickCapture,
        'local-match-preview': LocalMatchPreview,
        'dashboard-local-match': DashboardLocalMatch,
        'local-matches-panel': LocalMatchesPanel,
    };

    // Register all strategies from generated configs
    const allConfigs = getAllStrategyConfigs();
    for (const config of allConfigs) {
        const seam = getStrategiesForSeam(config.seam.id)[0]?.seam;
        if (!seam) {
            console.warn(`[StrategySystem] Seam not found for strategy ${config.id}: ${config.seam.id}`);
            continue;
        }

        // Determine strategy implementation (use statically imported component)
        const strategyImpl = strategyImplMap[config.id];
        if (!strategyImpl) {
            console.warn(`[StrategySystem] No component found for strategy ${config.id}`);
            continue;
        }

        const strategy = createComponentStrategy(
            config.id,
            seam,
            strategyImpl,
            config.version,
            config.defaultProps,
            config.paramSpec as ParamSpec
        );

        if (!strategyRegistry.has(strategy.name)) {
            strategyRegistry.register(strategy);
        }
        strategyComponentFactories.set(config.id, strategyImpl);
    }
}

/**
 * Apply revision params from localStorage to registered strategies
 * This enables the optimizer to test parameter changes in browser evaluations
 * B4.3: Proper error handling for failure modes - visible warnings, never silent no-op
 */
export function applyPendingRevisionParams(): void {
    if (typeof window === 'undefined') return;
    
    // Track if we successfully applied any patch
    let appliedAny = false;
    let hadErrors = false;
    
    try {
        const stored = localStorage.getItem('pendingRevisionData');
        if (!stored) {
            console.log('[StrategySystem] No pending revision data to apply');
            return;
        }
        
        // B4.3: Handle malformed JSON
        let patch: Record<string, unknown>;
        try {
            patch = JSON.parse(stored) as Record<string, unknown>;
        } catch (parseErr) {
            console.error('[StrategySystem] ❌ Malformed pendingRevisionData JSON:', parseErr);
            // Clear corrupted data
            localStorage.removeItem('pendingRevisionData');
            localStorage.removeItem('pendingRevision');
            hadErrors = true;
            return;
        }
        
        if (!patch || Object.keys(patch).length === 0) {
            console.log('[StrategySystem] Empty patch, nothing to apply');
            localStorage.removeItem('pendingRevisionData');
            localStorage.removeItem('pendingRevision');
            return;
        }
        
        console.log('[StrategySystem] Applying pending revision params:', patch);
        
        // Find which strategy this patch belongs to by checking paramSpecs
        const allConfigs = getAllStrategyConfigs();
        
        for (const strategyConfig of allConfigs) {
            const paramSpec = strategyConfig.paramSpec;
            const paramKeys = Object.keys(paramSpec);
            
            // Check if this patch has keys that belong to this strategy's paramSpec
            const matchingKeys = Object.keys(patch).filter(k => paramKeys.includes(k));
            if (matchingKeys.length === 0) continue;
            
            // B4.3: Check for unknown parameters in patch
            const unknownKeys = Object.keys(patch).filter(k => !paramKeys.includes(k));
            if (unknownKeys.length > 0) {
                console.warn(`[StrategySystem] ⚠️ Patch contains unknown parameters for ${strategyConfig.id}: ${unknownKeys.join(', ')}. They will be ignored.`);
            }
            
            // This patch applies to this strategy - re-register with merged props
            const seamId = strategyConfig.seam.id;
            const existingStrategy = getStrategy(seamId, strategyConfig.id);
            
            // B4.3: Unknown strategyId
            if (!existingStrategy) {
                console.error(`[StrategySystem] ❌ Unknown strategyId: ${strategyConfig.id} for seam ${seamId}. Available strategies: ${getStrategiesForSeam(seamId).map(s => s.id).join(', ')}`);
                hadErrors = true;
                continue;
            }
            
            // Get the component factory for this strategy
            const componentFactory = strategyComponentFactories.get(strategyConfig.id);
            if (!componentFactory) {
                console.error(`[StrategySystem] ❌ No component factory found for strategy ${strategyConfig.id}`);
                hadErrors = true;
                continue;
            }
            
            // Validate patch against paramSpec (check for invalid values)
            const validation = validatePatchAgainstSpec(paramSpec, patch);
            if (!validation.valid) {
                console.error(`[StrategySystem] ❌ Patch validation failed for ${strategyConfig.id}: ${validation.errors.join('; ')}`);
                hadErrors = true;
                continue;
            }
            
            // Unregister old strategy
            strategyRegistry.unregister(strategyConfig.id);
            
            // Merge default props with patch
            const mergedProps = { ...existingStrategy.getDefaultProps(), ...patch };
            
            // Re-register with merged props using the same component
            const newStrategy = createComponentStrategy(
                existingStrategy.id,
                existingStrategy.seam,
                componentFactory,
                existingStrategy.version,
                mergedProps,
                existingStrategy.params
            );
            
            strategyRegistry.register(newStrategy);
            // Update the component factory map (though it should be the same)
            strategyComponentFactories.set(strategyConfig.id, componentFactory);
            console.log(`[StrategySystem] ✅ Updated strategy ${strategyConfig.id} with revision params: ${matchingKeys.join(', ')}`);
            appliedAny = true;
            
            // Assuming one patch per strategy for now
            break;
        }
        
        if (!appliedAny && !hadErrors) {
            console.warn('[StrategySystem] ⚠️ No matching strategy found for patch keys:', Object.keys(patch));
            // Don't clear - let it persist for debugging
        } else if (appliedAny) {
            // Clear the pending revision data after successful apply
            localStorage.removeItem('pendingRevisionData');
            localStorage.removeItem('pendingRevision');
        }
    } catch (err) {
        console.error('[StrategySystem] ❌ Unexpected error applying pending revision params:', err);
        hadErrors = true;
    }
    
    // Show user-visible notification if there were errors
    if (hadErrors) {
        // In a real app, this would show a toast/notification
        // For now, we log visibly
        console.error('[StrategySystem] ⚠️ Revision application completed with errors. Check console for details.');
    }
}

/**
 * Validate a patch against a ParamSpec
 * Returns { valid: boolean, errors: string[] }
 */
function validatePatchAgainstSpec(paramSpec: Record<string, any>, patch: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [key, value] of Object.entries(patch)) {
        const def = paramSpec[key];
        if (!def) continue; // Unknown keys handled separately
        
        switch (def.type) {
            case 'number':
                if (typeof value !== 'number') {
                    errors.push(`${key}: expected number, got ${typeof value}`);
                } else {
                    if (def.min !== undefined && value < def.min) errors.push(`${key}: ${value} below minimum ${def.min}`);
                    if (def.max !== undefined && value > def.max) errors.push(`${key}: ${value} above maximum ${def.max}`);
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    errors.push(`${key}: expected boolean, got ${typeof value}`);
                }
                break;
            case 'enum':
                if (!def.options?.includes(value as string)) {
                    errors.push(`${key}: '${value}' not in allowed options [${def.options?.join(', ')}]`);
                }
                break;
            case 'string':
                if (typeof value !== 'string') {
                    errors.push(`${key}: expected string, got ${typeof value}`);
                }
                break;
        }
    }
    
    return { valid: errors.length === 0, errors };
}

import { DEFAULT_PROFILES, DEFAULT_MATCH_DISPLAY_EXPERIMENT } from '@notention/core/ui/profileDefaults';

export async function initializeProfiles(): Promise<void> {
    for (const profile of DEFAULT_PROFILES) {
        profileRegistry.registerProfile(profile);
    }

    // Register experiment for match-display comparison
    // Use the SeamRole directly (not the resolved seam ID)
    const matchSeamRole = SEAM_ROLES.MATCH;
    profileRegistry.registerExperiment({
        ...DEFAULT_MATCH_DISPLAY_EXPERIMENT,
        seamId: matchSeamRole,
        variants: DEFAULT_MATCH_DISPLAY_EXPERIMENT.variants.map(v => ({ ...v, seamId: matchSeamRole })),
    });
}

let initPromise: Promise<void> | null = null;

// Start strategy system initialization early (at module load time) to avoid
// React 19 hydration error #525 from lazy initialization during render
const _initPromise = initializeStrategySystem();

export function initializeStrategySystem(): Promise<void> {
    initPromise ??= (async () => {
        await initializeProfiles();
        await registerUIStrategies();
        // Apply any pending revision params from optimizer
        applyPendingRevisionParams();
    })();
    return initPromise;
}

const USER_CONFIG_KEY = 'notention:user-config';

export function persistUserConfig(userId: string): void {
    if (typeof window === 'undefined') return;
    try {
        const config = profileRegistry.getUserConfig(userId);
        localStorage.setItem(USER_CONFIG_KEY, JSON.stringify(config));
    } catch (err) {
        console.warn('Failed to persist user config:', err);
    }
}

export function loadUserConfig(userId: string): void {
    if (typeof window === 'undefined') return;
    try {
        const stored = localStorage.getItem(USER_CONFIG_KEY);
        if (stored) {
            const config = JSON.parse(stored);
            profileRegistry.setUserConfig(config);
        }
    } catch (err) {
        console.warn('Failed to load user config:', err);
    }
}