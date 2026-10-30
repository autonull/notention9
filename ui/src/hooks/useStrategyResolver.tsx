import { useMemo, useContext, createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { profileRegistry, type StrategyProfile, type UserProfileConfig, type StrategyExperiment, type ExperimentAssignment, DEFAULT_MATCH_DISPLAY_EXPERIMENT } from '@notention/core/ui/profile';
import { strategyRegistry, type Seam, type Strategy, createComponentStrategy } from '@notention/core/ui/strategy';
import { DescribeItComposerStrategy } from '../strategies/DescribeItComposerStrategy';
import { TagInputStrategy } from '../strategies/TagInputStrategy';
import { PropertyFormStrategy } from '../strategies/PropertyFormStrategy';
import { TemplateSelectorStrategy } from '../strategies/TemplateSelectorStrategy';

// Seam IDs from discovery (sync with loop/discovered.json)
export const SEAM_IDS = {
    CAPTURE: 'capture-20',
    ELICIT: 'elicit-1',
    MATCH: 'match-7',
    DISPLAY: 'display-38',
    LAYOUT: 'layout-8',
    ONTOLOGY: 'ontology-5',
    INTENT: 'intent-1',
} as const;

export type SeamId = typeof SEAM_IDS[keyof typeof SEAM_IDS];

// Strategy context for React components
interface StrategyContextValue {
    resolveStrategy: (seamId: SeamId) => Strategy | undefined;
    getActiveProfile: () => StrategyProfile | undefined;
    setActiveProfile: (profileId: string) => boolean;
    setOverride: (seamId: SeamId, strategyId: string) => void;
    removeOverride: (seamId: SeamId) => void;
    setManualMode: (manual: boolean) => void;
    userId: string;
    isManualMode: boolean;
    activeProfileId: string;
    overrides: Record<string, string>;
}

const StrategyContext = createContext<StrategyContextValue | null>(null);

export function useStrategy(): StrategyContextValue {
    const context = useContext(StrategyContext);
    if (!context) {
        throw new Error('useStrategy must be used within a StrategyProvider');
    }
    return context;
}

interface StrategyProviderProps {
    children: ReactNode;
    userId?: string;
}

export function StrategyProvider({ children, userId = 'default-user' }: StrategyProviderProps) {
    const [userConfig, setUserConfigState] = useState(() => profileRegistry.getUserConfig(userId));
    
    // Sync with profileRegistry on mount
    useEffect(() => {
        const config = profileRegistry.getUserConfig(userId);
        setUserConfigState(config);
    }, [userId]);

    const persistConfig = useCallback(() => {
        persistUserConfig(userId);
    }, [userId]);

    const resolveStrategy = useMemo(() => (seamId: SeamId) => {
        return profileRegistry.resolveStrategy(userId, seamId, strategyRegistry.strategies);
    }, [userId]);

    const getActiveProfile = useMemo(() => () => {
        const config = profileRegistry.getUserConfig(userId);
        return profileRegistry.getProfile(config.activeProfileId);
    }, [userId]);

    const setActiveProfile = useMemo(() => (profileId: string) => {
        const result = profileRegistry.setActiveProfile(userId, profileId);
        if (result) {
            setUserConfigState(profileRegistry.getUserConfig(userId));
            persistConfig();
        }
        return result;
    }, [userId, persistConfig]);

    const setOverride = useMemo(() => (seamId: SeamId, strategyId: string) => {
        profileRegistry.setOverride(userId, seamId, strategyId);
        setUserConfigState(profileRegistry.getUserConfig(userId));
        persistConfig();
    }, [userId, persistConfig]);

    const removeOverride = useMemo(() => (seamId: SeamId) => {
        profileRegistry.removeOverride(userId, seamId);
        setUserConfigState(profileRegistry.getUserConfig(userId));
        persistConfig();
    }, [userId, persistConfig]);

    const setManualMode = useMemo(() => (manual: boolean) => {
        profileRegistry.setManualMode(userId, manual);
        setUserConfigState(profileRegistry.getUserConfig(userId));
        persistConfig();
    }, [userId, persistConfig]);

    const value = useMemo(() => ({
        resolveStrategy,
        getActiveProfile,
        setActiveProfile,
        setOverride,
        removeOverride,
        setManualMode,
        userId,
        isManualMode: userConfig.manualMode,
        activeProfileId: userConfig.activeProfileId,
        overrides: userConfig.overrides.overrides,
    }), [
        resolveStrategy,
        getActiveProfile,
        setActiveProfile,
        setOverride,
        removeOverride,
        setManualMode,
        userId,
        userConfig.manualMode,
        userConfig.activeProfileId,
        userConfig.overrides.overrides,
    ]);

    return <StrategyContext.Provider value={value}>{children}</StrategyContext.Provider>;
}

// Hook for components to use a specific seam's strategy
export function useSeamStrategy<P = Record<string, unknown>>(seamId: SeamId): Strategy<P> | undefined {
    const { resolveStrategy } = useStrategy();
    return resolveStrategy(seamId) as Strategy<P> | undefined;
}

// Forward declarations for component types
type QuickCaptureComponent = React.ComponentType<{
    input: string;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    extractedProps: Array<{key: string; values: string[]}>;
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

// Import components lazily to avoid circular deps
let quickCaptureComponent: QuickCaptureComponent | null = null;
let insertPropertyModalComponent: InsertPropertyModalComponent | null = null;
let localMatchPreviewComponent: LocalMatchPreviewComponent | null = null;
let dashboardLocalMatchComponent: DashboardLocalMatchComponent | null = null;
let localMatchesPanelComponent: LocalMatchesPanelComponent | null = null;
let propertyPanelComponent: PropertyPanelComponent | null = null;

async function loadComponents() {
    if (!quickCaptureComponent) {
        const { QuickCapture } = await import('../components/dashboard/QuickCapture');
        quickCaptureComponent = QuickCapture;
    }
    if (!insertPropertyModalComponent) {
        const { InsertPropertyModal } = await import('../components/editor/InsertPropertyModal');
        insertPropertyModalComponent = InsertPropertyModal;
    }
    if (!localMatchPreviewComponent) {
        const { LocalMatchPreview } = await import('../components/dashboard/LocalMatchPreview');
        localMatchPreviewComponent = LocalMatchPreview;
    }
    if (!dashboardLocalMatchComponent) {
        const { DashboardLocalMatch } = await import('../components/dashboard/DashboardLocalMatch');
        dashboardLocalMatchComponent = DashboardLocalMatch;
    }
    if (!localMatchesPanelComponent) {
        const { LocalMatchesPanel } = await import('../components/assistant/LocalMatchesPanel');
        localMatchesPanelComponent = LocalMatchesPanel;
    }
    if (!propertyPanelComponent) {
        const { PropertyPanel } = await import('../components/assistant/PropertyPanel');
        propertyPanelComponent = PropertyPanel;
    }
}

// Initialize profiles to match actual seam IDs
export function initializeProfiles(): void {
    const profiles: StrategyProfile[] = [
        {
            id: 'default',
            name: 'Default',
            description: 'Balanced experience for all users',
            strategySelections: {
                [SEAM_IDS.CAPTURE]: 'describe-it-composer',
                [SEAM_IDS.ELICIT]: 'tag-input',
                [SEAM_IDS.MATCH]: 'local-match-preview',
                [SEAM_IDS.LAYOUT]: 'property-panel',
            },
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: 'compact',
            name: 'Compact',
            description: 'Dense information, minimal UI',
            strategySelections: {
                [SEAM_IDS.CAPTURE]: 'quick-capture',
                [SEAM_IDS.ELICIT]: 'tag-input',
                [SEAM_IDS.MATCH]: 'dashboard-local-match',
                [SEAM_IDS.LAYOUT]: 'property-panel',
            },
            context: { persona: 'power-user' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: 'guided',
            name: 'Guided',
            description: 'More explanations, progressive disclosure',
            strategySelections: {
                [SEAM_IDS.CAPTURE]: 'describe-it-composer',
                [SEAM_IDS.ELICIT]: 'insert-property-modal',
                [SEAM_IDS.MATCH]: 'local-match-preview',
                [SEAM_IDS.LAYOUT]: 'property-panel',
            },
            context: { persona: 'new-user' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: 'accessible',
            name: 'Accessible',
            description: 'High contrast, full keyboard support, screen reader optimized',
            strategySelections: {
                [SEAM_IDS.CAPTURE]: 'describe-it-composer',
                [SEAM_IDS.ELICIT]: 'tag-input',
                [SEAM_IDS.MATCH]: 'local-match-preview',
                [SEAM_IDS.LAYOUT]: 'property-panel',
            },
            context: { persona: 'accessibility' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ];

    for (const profile of profiles) {
        profileRegistry.registerProfile(profile);
    }

    // Load persisted user configs from localStorage
    loadPersistedConfigs();

    // Register experiment for match-display comparison
    profileRegistry.registerExperiment({
        ...DEFAULT_MATCH_DISPLAY_EXPERIMENT,
        seamId: SEAM_IDS.MATCH,
        variants: DEFAULT_MATCH_DISPLAY_EXPERIMENT.variants.map((v: any) => ({
            ...v,
            seamId: SEAM_IDS.MATCH,
        })),
    });
}

// Persist user configs to localStorage
const STORAGE_KEY = 'notention:profile-config';

function loadPersistedConfigs(): void {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            if (data.userConfigs) {
                for (const config of data.userConfigs) {
                    profileRegistry.userConfigs.set(config.userId, config);
                }
            }
            if (data.assignments) {
                for (const assignment of data.assignments) {
                    profileRegistry.assignments.set(`${assignment.experimentId}:${assignment.userId}`, assignment);
                }
            }
        }
    } catch (e) {
        console.warn('Failed to load persisted profile configs:', e);
    }
}

export function persistUserConfig(userId: string): void {
    try {
        const config = profileRegistry.getUserConfig(userId);
        const assignments = Array.from(profileRegistry.assignments.values())
            .filter(a => a.userId === userId);
        
        const existing = localStorage.getItem(STORAGE_KEY);
        const data = existing ? JSON.parse(existing) : { userConfigs: [], assignments: [] };
        
        // Update or add user config
        const configIndex = data.userConfigs.findIndex((c: any) => c.userId === userId);
        if (configIndex >= 0) {
            data.userConfigs[configIndex] = config;
        } else {
            data.userConfigs.push(config);
        }
        
        // Update assignments
        data.assignments = data.assignments.filter((a: any) => a.userId !== userId);
        data.assignments.push(...assignments);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to persist profile config:', e);
    }
}

// Register UI strategies with the core registry
export async function registerUIStrategies(): Promise<void> {
    await loadComponents();

    // Define seams matching discovery
    const seams: Seam[] = [
        {
            id: SEAM_IDS.CAPTURE,
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
            id: SEAM_IDS.ELICIT,
            name: 'Elicit',
            description: 'Progressive property elicitation',
            role: 'elicit',
            components: ['InsertPropertyModal', 'TagInput'],
            propsShape: {
                isOpen: 'boolean',
                onClose: '() => void',
                onInsert: '(key: string, operator: string, value: string, icon?: string) => void',
                initialKey: 'string?',
                initialOperator: 'string?',
                initialValue: 'string?',
                attributeDef: 'OntologyAttribute?',
                ontology: 'OntologyNode[]?',
                isEditing: 'boolean?',
                onPickLocation: '() => Promise<string>?',
                suggestions: 'SuggestedAttribute[]?',
            },
        },
        {
            id: SEAM_IDS.MATCH,
            name: 'Match Display',
            description: 'Display and explain match results',
            role: 'display',
            components: ['LocalMatchesPanel', 'LocalMatchPreview', 'DashboardLocalMatch'],
            propsShape: {
                localMatches: 'ScoredMatch[]',
                contacts: 'Contact[]',
                onSelect: '(match: ScoredMatch) => void',
            },
        },
        {
            id: SEAM_IDS.LAYOUT,
            name: 'Workspace Layout',
            description: 'Overall workspace arrangement',
            role: 'layout',
            components: ['PropertyPanel', 'DashboardView', 'NotesView'],
            propsShape: {
                properties: 'Property[]',
                isAddingProperty: 'boolean',
                setIsAddingProperty: '(adding: boolean) => void',
                editingPropertyIndex: 'number | null',
                setEditingPropertyIndex: '(index: number | null) => void',
                propertyToDelete: 'Property | null',
                setPropertyToDelete: '(prop: Property | null) => void',
                onSaveProperty: '(key: string, op: string, value: string) => void',
                onCancelEdit: '() => void',
                onAcceptReview: '(item: PropertyReviewItem) => void',
                propertyReview: 'PropertyReviewItem | null',
                onDeleteProperty: '() => void',
                onPickLocation: '() => void?',
                onPickTime: '(key: string) => void?',
                ontology: 'OntologyNode[]?',
            },
        },
    ];

    // Register strategies for capture seam
    strategyRegistry.register(seams[0], DescribeItComposerStrategy);
    if (quickCaptureComponent) {
        strategyRegistry.register(seams[0], createComponentStrategy(
            'quick-capture',
            seams[0],
            quickCaptureComponent,
            '1.0.0'
        ));
    }

    // Register strategies for elicit seam
    strategyRegistry.register(seams[1], TagInputStrategy);
    strategyRegistry.register(seams[1], PropertyFormStrategy);
    if (insertPropertyModalComponent) {
        strategyRegistry.register(seams[1], createComponentStrategy(
            'insert-property-modal',
            seams[1],
            insertPropertyModalComponent,
            '1.0.0'
        ));
    }

    // Register strategies for match seam
    if (localMatchPreviewComponent) {
        strategyRegistry.register(seams[2], createComponentStrategy(
            'local-match-preview',
            seams[2],
            localMatchPreviewComponent,
            '1.0.0'
        ));
    }
    if (dashboardLocalMatchComponent) {
        strategyRegistry.register(seams[2], createComponentStrategy(
            'dashboard-local-match',
            seams[2],
            dashboardLocalMatchComponent,
            '1.0.0'
        ));
    }
    if (localMatchesPanelComponent) {
        strategyRegistry.register(seams[2], createComponentStrategy(
            'local-matches-panel',
            seams[2],
            localMatchesPanelComponent,
            '1.0.0'
        ));
    }

    // Register strategies for layout seam
    if (propertyPanelComponent) {
        strategyRegistry.register(seams[3], createComponentStrategy(
            'property-panel',
            seams[3],
            propertyPanelComponent,
            '1.0.0'
        ));
    }
}

// Initialize everything
export async function initializeStrategySystem(): Promise<void> {
    await registerUIStrategies();
    initializeProfiles();
}