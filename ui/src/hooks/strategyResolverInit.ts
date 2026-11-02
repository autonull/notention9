/**
 * Strategy resolver initialization
 * Handles component loading, seam registration, and strategy registration
 * Uses generated seam-definitions.ts as single source of truth.
 */

import type { Seam, Strategy } from '@notention/core/ui/strategy';
import { strategyRegistry, createComponentStrategy } from '@notention/core/ui/strategy';
import { resolveSeamId, SEAM_ROLES, type SeamRole } from '@notention/core/constants/seams';
import { profileRegistry } from '@notention/core/ui/ProfileRegistry';
import { STRATEGY_CONFIGS_UI, getAllStrategyConfigs } from '@notention/ui/strategies/strategyConfigs';
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

// Lazy-loaded components - keyed by strategy ID (from generated definitions)
const componentFactories = new Map<string, () => Promise<React.ComponentType<any>>>();

function registerComponentFactory(strategyId: string, importFn: () => Promise<{ default: React.ComponentType<any> }>): void {
    componentFactories.set(strategyId, async () => {
        const mod = await importFn();
        return mod.default;
    });
}

// Register component factories using generated component paths
for (const config of STRATEGY_CONFIGS_UI) {
    if (config.componentPath) {
        // Dynamic import using the path from generated definitions
        const path = config.componentPath;
        registerComponentFactory(config.id, () => import(`../${path}`));
    }
}

// Strategy component factories for re-registration with revised params
const strategyComponentFactories = new Map<string, React.ComponentType<any>>();

async function loadComponent(strategyId: string): Promise<React.ComponentType<any> | undefined> {
    const factory = componentFactories.get(strategyId);
    if (!factory) return undefined;
    return factory();
}

// Check if running in clean-profile mode (for stranger testing)
const isCleanProfile =
    typeof window !== 'undefined' &&
    (window.location.search.includes('clean=true') || localStorage.getItem('notention:clean-profile') === 'true');

if (isCleanProfile) {
    localStorage.removeItem('notention:clean-profile');
}

export async function registerUIStrategies(): Promise<void> {
    // Register seams from generated definitions (one per role, using first seam for each role)
    const seamRoles = Object.values(SEAM_ROLES) as SeamRole[];
    const seenRoles = new Set<SeamRole>();
    
    for (const def of SEAM_DEFINITIONS) {
        const role = def.role as SeamRole;
        if (seenRoles.has(role)) continue;
        seenRoles.add(role);
        
        const seamId = resolveSeamId(role, strategyRegistry);
        const seam: Seam = {
            id: seamId,
            name: def.name,
            description: def.description,
            role,
            components: def.components,
            propsShape: def.propsShape,
        };
        // Create a minimal strategy for seam registration (placeholder component)
        const seamStrategy = createComponentStrategy(
            `seam-${role}`,
            seam,
            () => null,
            '1.0.0',
            {},
            {}
        );
        strategyRegistry.register(seamStrategy);
    }

    // Import custom strategy implementations (these have custom logic beyond simple component rendering)
    const { DescribeItComposerStrategy } = await import('../strategies/DescribeItComposerStrategy');
    const { TagInputStrategy } = await import('../strategies/TagInputStrategy');
    const { PropertyFormStrategy } = await import('../strategies/PropertyFormStrategy');
    const { TemplateSelectorStrategy } = await import('../strategies/TemplateSelectorStrategy');

    // Map of strategy ID to custom strategy implementation
    const strategyImplMap: Record<string, React.ComponentType<any>> = {
        'describe-it-composer': DescribeItComposerStrategy,
        'tag-input': TagInputStrategy,
        'property-form': PropertyFormStrategy,
        'template-selector': TemplateSelectorStrategy,
    };

    // Register all strategies from generated configs
    const allConfigs = getAllStrategyConfigs();
    for (const config of allConfigs) {
        const seam = strategyRegistry.getAllForSeam(config.seam.id)[0]?.seam;
        if (!seam) {
            console.warn(`[StrategySystem] Seam not found for strategy ${config.id}: ${config.seam.id}`);
            continue;
        }

        // Load component for this strategy
        const component = await loadComponent(config.id);
        if (!component) {
            console.warn(`[StrategySystem] No component found for strategy ${config.id}`);
            continue;
        }

        // Determine strategy implementation (use custom impl if available, else component)
        const strategyImpl = strategyImplMap[config.id] ?? component;

        const strategy = createComponentStrategy(
            config.id,
            seam,
            strategyImpl,
            config.version,
            config.defaultProps,
            config.paramSpec
        );

        strategyRegistry.register(strategy);
        strategyComponentFactories.set(config.id, strategyImpl);
    }
}

/**
 * Apply revision params from localStorage to registered strategies
 * This enables the optimizer to test parameter changes in browser evaluations
 */
export function applyPendingRevisionParams(): void {
    if (typeof window === 'undefined') return;
    
    try {
        const stored = localStorage.getItem('pendingRevisionData');
        if (!stored) return;
        
        const patch = JSON.parse(stored) as Record<string, unknown>;
        if (!patch || Object.keys(patch).length === 0) return;
        
        console.log('[StrategySystem] Applying pending revision params:', patch);
        
        // Find which strategy this patch belongs to by checking paramSpecs
        const allConfigs = getAllStrategyConfigs();
        for (const strategyConfig of allConfigs) {
            const paramSpec = strategyConfig.paramSpec;
            const paramKeys = Object.keys(paramSpec);
            
            // Check if this patch has keys that belong to this strategy's paramSpec
            const matchingKeys = Object.keys(patch).filter(k => paramKeys.includes(k));
            if (matchingKeys.length === 0) continue;
            
            // This patch applies to this strategy - re-register with merged props
            const seamId = strategyConfig.seam.id;
            const existingStrategy = strategyRegistry.get(seamId, strategyConfig.id);
            
            if (existingStrategy) {
                // Get the component factory for this strategy
                const componentFactory = strategyComponentFactories.get(strategyConfig.id);
                if (!componentFactory) {
                    console.warn(`[StrategySystem] No component factory found for strategy ${strategyConfig.id}`);
                    continue;
                }
                
                // Unregister old strategy
                strategyRegistry.unregister(seamId, strategyConfig.id);
                
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
                console.log(`[StrategySystem] Updated strategy ${strategyConfig.id} with revision params`);
            }
            
            // Assuming one patch per strategy for now
            break;
        }
        
        // Clear the pending revision data after applying
        localStorage.removeItem('pendingRevisionData');
        localStorage.removeItem('pendingRevision');
    } catch (err) {
        console.warn('[StrategySystem] Failed to apply pending revision params:', err);
    }
}

import { DEFAULT_PROFILES, DEFAULT_MATCH_DISPLAY_EXPERIMENT } from '@notention/core/ui/profileDefaults';

export async function initializeProfiles(): Promise<void> {
    for (const profile of DEFAULT_PROFILES) {
        profileRegistry.registerProfile(profile);
    }

    // Register experiment for match-display comparison
    const matchSeamId = resolveSeamId(SEAM_ROLES.MATCH, strategyRegistry);
    profileRegistry.registerExperiment({
        ...DEFAULT_MATCH_DISPLAY_EXPERIMENT,
        seamId: matchSeamId,
        variants: DEFAULT_MATCH_DISPLAY_EXPERIMENT.variants.map(v => ({ ...v, seamId: matchSeamId })),
    });
}

export async function initializeStrategySystem(): Promise<void> {
    await initializeProfiles();
    await registerUIStrategies();
    // Apply any pending revision params from optimizer
    applyPendingRevisionParams();
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