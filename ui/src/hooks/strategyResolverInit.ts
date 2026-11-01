/**
 * Strategy resolver initialization
 * Handles component loading, seam registration, and strategy registration
 */

import type { Seam } from '@notention/core/ui/strategy';
import { strategyRegistry } from '@notention/core/ui/strategy';
import { resolveSeamId, SEAM_ROLES, type SeamRole } from '@notention/core/constants/seams';
import { profileRegistry } from '@notention/core/ui/ProfileRegistry';

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

// Lazy-loaded components
const components = {
    quickCapture: null as QuickCaptureComponent | null,
    insertPropertyModal: null as InsertPropertyModalComponent | null,
    localMatchPreview: null as LocalMatchPreviewComponent | null,
    dashboardLocalMatch: null as DashboardLocalMatchComponent | null,
    localMatchesPanel: null as LocalMatchesPanelComponent | null,
    propertyPanel: null as PropertyPanelComponent | null,
};

async function loadComponents(): Promise<void> {
    if (!components.quickCapture) {
        const { QuickCapture } = await import('../components/dashboard/QuickCapture');
        components.quickCapture = QuickCapture;
    }
    if (!components.insertPropertyModal) {
        const { InsertPropertyModal } = await import('../components/editor/InsertPropertyModal');
        components.insertPropertyModal = InsertPropertyModal;
    }
    if (!components.localMatchPreview) {
        const { LocalMatchPreview } = await import('../components/dashboard/LocalMatchPreview');
        components.localMatchPreview = LocalMatchPreview;
    }
    if (!components.dashboardLocalMatch) {
        const { DashboardLocalMatch } = await import('../components/dashboard/DashboardLocalMatch');
        components.dashboardLocalMatch = DashboardLocalMatch;
    }
    if (!components.localMatchesPanel) {
        const { LocalMatchesPanel } = await import('../components/assistant/LocalMatchesPanel');
        components.localMatchesPanel = LocalMatchesPanel;
    }
    if (!components.propertyPanel) {
        const { PropertyPanel } = await import('../components/assistant/PropertyPanel');
        components.propertyPanel = PropertyPanel;
    }
}

// Check if running in clean-profile mode (for stranger testing)
const isCleanProfile =
    typeof window !== 'undefined' &&
    (window.location.search.includes('clean=true') || localStorage.getItem('notention:clean-profile') === 'true');

if (isCleanProfile) {
    localStorage.removeItem('notention:clean-profile');
    // Note: profileConfigStore is imported elsewhere, this is a side effect
}

export async function registerUIStrategies(): Promise<void> {
    await loadComponents();

    // Resolve seam IDs dynamically from the strategy registry (populated by discovery)
    const captureSeamId = resolveSeamId(SEAM_ROLES.CAPTURE, strategyRegistry);
    const elicitSeamId = resolveSeamId(SEAM_ROLES.ELICIT, strategyRegistry);
    const matchSeamId = resolveSeamId(SEAM_ROLES.MATCH, strategyRegistry);
    const layoutSeamId = resolveSeamId(SEAM_ROLES.LAYOUT, strategyRegistry);

    const seams: Seam[] = [
        {
            id: captureSeamId,
            name: 'Capture',
            description: 'Natural language capture interface',
            role: 'capture',
            components: ['QuickCapture', 'DescribeItComposer'],
            propsShape: {
                input: 'string',
                onInputChange: '(value: string) => void',
                onSubmit: '(e: React.FormEvent) => void',
                extractedProps: 'Array<{key: string; values: string[]}>',
                onTemplateClick: '(type: string) => void',
            },
        },
        {
            id: elicitSeamId,
            name: 'Elicit',
            description: 'Property elicitation interface',
            role: 'elicit',
            components: ['TagInput', 'InsertPropertyModal'],
            propsShape: {
                onInsert: '(key: string, operator: string, value: string, icon?: string) => void',
                initialKey: 'string',
                initialOperator: 'string',
                initialValue: 'string',
                attributeDef: 'any',
                ontology: 'any[]',
                isEditing: 'boolean',
                onPickLocation: '() => Promise<string>',
                suggestions: 'any[]',
            },
        },
        {
            id: matchSeamId,
            name: 'Match Display',
            description: 'Match explanation and selection interface',
            role: 'display',
            components: ['LocalMatchPreview', 'DashboardLocalMatch'],
            propsShape: {
                match: 'any',
                onSelectNote: '(noteId: string) => void',
                onRejectMatch: '(matchId: string) => void',
                onReviseRequest: '() => void',
                notes: 'any[]',
            },
        },
        {
            id: layoutSeamId,
            name: 'Layout',
            description: 'Workspace layout and panel arrangement',
            role: 'layout',
            components: ['PropertyPanel', 'LocalMatchesPanel'],
            propsShape: {
                properties: 'any[]',
                isAddingProperty: 'boolean',
                setIsAddingProperty: '(adding: boolean) => void',
                editingPropertyIndex: 'number | null',
                setEditingPropertyIndex: '(index: number | null) => void',
                propertyToDelete: 'any | null',
                setPropertyToDelete: '(prop: any | null) => void',
                onSaveProperty: '(key: string, op: string, value: string) => void',
                onCancelEdit: '() => void',
                onAcceptReview: '(item: any) => void',
                propertyReview: 'any | null',
                onDeleteProperty: '() => void',
                onPickLocation: '() => void',
                onPickTime: '(key: string) => void',
                ontology: 'any[]',
                localMatches: 'any[]',
                contacts: 'any[]',
                onSelect: '(match: any) => void',
            },
        },
    ];

    for (const seam of seams) {
        strategyRegistry.register(seam);
    }

    // Import strategies dynamically to avoid circular deps
    const { DescribeItComposerStrategy } = await import('../strategies/DescribeItComposerStrategy');
    const { TagInputStrategy } = await import('../strategies/TagInputStrategy');
    const { PropertyFormStrategy } = await import('../strategies/PropertyFormStrategy');
    const { TemplateSelectorStrategy } = await import('../strategies/TemplateSelectorStrategy');
    const { createComponentStrategy } = await import('@notention/core/ui/strategy');
    const { STRATEGY_CONFIGS, getStrategyConfig } = await import('../strategies/strategyConfigs');

    // Get seam objects from registry (registered above)
    const captureSeam = strategyRegistry.getAllForSeam(captureSeamId)[0]?.seam;
    const elicitSeam = strategyRegistry.getAllForSeam(elicitSeamId)[0]?.seam;
    const matchSeam = strategyRegistry.getAllForSeam(matchSeamId)[0]?.seam;
    const layoutSeam = strategyRegistry.getAllForSeam(layoutSeamId)[0]?.seam;

    // Register capture strategies
    if (captureSeam) {
        const describeItConfig = getStrategyConfig('describe-it-composer');
        if (describeItConfig) {
            strategyRegistry.register(createComponentStrategy(
                describeItConfig.id, captureSeam, DescribeItComposerStrategy,
                describeItConfig.version, describeItConfig.defaultProps, describeItConfig.paramSpec
            ));
        }
        strategyRegistry.register(createComponentStrategy('quick-capture', captureSeam, () => components.quickCapture!));
    }

    // Register elicit strategies
    if (elicitSeam) {
        const tagInputConfig = getStrategyConfig('tag-input');
        if (tagInputConfig) {
            strategyRegistry.register(createComponentStrategy(
                tagInputConfig.id, elicitSeam, TagInputStrategy,
                tagInputConfig.version, tagInputConfig.defaultProps, tagInputConfig.paramSpec
            ));
        }
        strategyRegistry.register(createComponentStrategy('insert-property-modal', elicitSeam, () => components.insertPropertyModal!));
    }

    // Register match strategies
    if (matchSeam) {
        const localMatchPreviewConfig = getStrategyConfig('local-match-preview');
        if (localMatchPreviewConfig) {
            strategyRegistry.register(createComponentStrategy(
                localMatchPreviewConfig.id, matchSeam, () => components.localMatchPreview!,
                localMatchPreviewConfig.version, localMatchPreviewConfig.defaultProps, localMatchPreviewConfig.paramSpec
            ));
        }
        const dashboardLocalMatchConfig = getStrategyConfig('dashboard-local-match');
        if (dashboardLocalMatchConfig) {
            strategyRegistry.register(createComponentStrategy(
                dashboardLocalMatchConfig.id, matchSeam, () => components.dashboardLocalMatch!,
                dashboardLocalMatchConfig.version, dashboardLocalMatchConfig.defaultProps, dashboardLocalMatchConfig.paramSpec
            ));
        }
    }

    // Register layout strategies
    if (layoutSeam) {
        const propertyFormConfig = getStrategyConfig('property-form');
        if (propertyFormConfig) {
            strategyRegistry.register(createComponentStrategy(
                propertyFormConfig.id, layoutSeam, PropertyFormStrategy,
                propertyFormConfig.version, propertyFormConfig.defaultProps, propertyFormConfig.paramSpec
            ));
        }
        const templateSelectorConfig = getStrategyConfig('template-selector');
        if (templateSelectorConfig) {
            strategyRegistry.register(createComponentStrategy(
                templateSelectorConfig.id, layoutSeam, TemplateSelectorStrategy,
                templateSelectorConfig.version, templateSelectorConfig.defaultProps, templateSelectorConfig.paramSpec
            ));
        }
        const localMatchesPanelConfig = getStrategyConfig('local-matches-panel');
        if (localMatchesPanelConfig) {
            strategyRegistry.register(createComponentStrategy(
                localMatchesPanelConfig.id, layoutSeam, () => components.localMatchesPanel!,
                localMatchesPanelConfig.version, localMatchesPanelConfig.defaultProps, localMatchesPanelConfig.paramSpec
            ));
        }
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