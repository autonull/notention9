import { useMemo, useContext, createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    profileRegistry,
    type StrategyProfile,
    type UserProfileConfig,
    type StrategyExperiment,
    type ExperimentAssignment,
    DEFAULT_PROFILES,
    DEFAULT_MATCH_DISPLAY_EXPERIMENT,
} from '@notention/core/ui/profile';
import { strategyRegistry, type Seam, type Strategy, createComponentStrategy } from '@notention/core/ui/strategy';
import { JsonStore } from '@notention/core/storage';
import { DescribeItComposerStrategy } from '../strategies/DescribeItComposerStrategy';
import { TagInputStrategy } from '../strategies/TagInputStrategy';
import { PropertyFormStrategy } from '../strategies/PropertyFormStrategy';
import { TemplateSelectorStrategy } from '../strategies/TemplateSelectorStrategy';
import { SEAM_IDS, type SeamId } from '../constants/seams';

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
        setUserConfigState(profileRegistry.getUserConfig(userId));
    }, [userId]);

    const persistConfig = useCallback(() => { persistUserConfig(userId); }, [userId]);

    const resolveStrategy = useMemo(
        () => (seamId: SeamId) => profileRegistry.resolveStrategy(userId, seamId, strategyRegistry.strategies),
        [userId]
    );

    const getActiveProfile = useMemo(
        () => () => {
            const config = profileRegistry.getUserConfig(userId);
            return profileRegistry.getProfile(config.activeProfileId);
        },
        [userId]
    );

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

    const value = useMemo(
        () => ({
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
        }),
        [
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
        ]
    );

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
    await profileConfigStore.clear();
}

// Initialize profiles from core defaults
export async function initializeProfiles(): Promise<void> {
    for (const profile of DEFAULT_PROFILES) {
        profileRegistry.registerProfile(profile);
    }

    // Load persisted user configs from storage
    await loadPersistedConfigs();

    // Register experiment for match-display comparison
    profileRegistry.registerExperiment({
        ...DEFAULT_MATCH_DISPLAY_EXPERIMENT,
        seamId: SEAM_IDS.MATCH,
        variants: DEFAULT_MATCH_DISPLAY_EXPERIMENT.variants.map(v => ({ ...v, seamId: SEAM_IDS.MATCH })),
    });
}

// Persist user configs to storage
const STORAGE_KEY = 'notention:profile-config';
const profileConfigStore = new JsonStore<{
    userConfigs: UserProfileConfig[];
    assignments: ExperimentAssignment[];
}>(STORAGE_KEY);

async function loadPersistedConfigs(): Promise<void> {
    try {
        const data = await profileConfigStore.load();
        if (!data) return;
        data.userConfigs?.forEach((config: UserProfileConfig) =>
            profileRegistry.userConfigs.set(config.userId, config)
        );
        data.assignments?.forEach((assignment: ExperimentAssignment) =>
            profileRegistry.assignments.set(`${assignment.experimentId}:${assignment.userId}`, assignment)
        );
    } catch (e) {
        console.warn('Failed to load persisted profile configs:', e);
    }
}

export async function persistUserConfig(userId: string): Promise<void> {
    try {
        const config = profileRegistry.getUserConfig(userId);
        const assignments = Array.from(profileRegistry.assignments.values()).filter(a => a.userId === userId);

        const existing = await profileConfigStore.load();
        const data = existing ?? { userConfigs: [], assignments: [] };

        const configIndex = data.userConfigs.findIndex((c: any) => c.userId === userId);
        if (configIndex >= 0) data.userConfigs[configIndex] = config;
        else data.userConfigs.push(config);

        data.assignments = data.assignments.filter((a: any) => a.userId !== userId);
        data.assignments.push(...assignments);

        await profileConfigStore.save(data);
    } catch (e) {
        console.warn('Failed to persist profile config:', e);
    }
}

// Register UI strategies with the core registry
export async function registerUIStrategies(): Promise<void> {
    await loadComponents();

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
            id: SEAM_IDS.MATCH,
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
            id: SEAM_IDS.LAYOUT,
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

    // Register capture strategies
    strategyRegistry.register(createComponentStrategy(SEAM_IDS.CAPTURE, 'describe-it-composer', DescribeItComposerStrategy, components.quickCapture!));
    strategyRegistry.register(createComponentStrategy(SEAM_IDS.CAPTURE, 'quick-capture', () => components.quickCapture!, components.quickCapture!));

    // Register elicit strategies
    strategyRegistry.register(createComponentStrategy(SEAM_IDS.ELICIT, 'tag-input', TagInputStrategy, components.insertPropertyModal!));
    strategyRegistry.register(createComponentStrategy(SEAM_IDS.ELICIT, 'insert-property-modal', () => components.insertPropertyModal!, components.insertPropertyModal!));

    // Register match strategies
    strategyRegistry.register(createComponentStrategy(SEAM_IDS.MATCH, 'local-match-preview', () => components.localMatchPreview!, components.localMatchPreview!));
    strategyRegistry.register(createComponentStrategy(SEAM_IDS.MATCH, 'dashboard-local-match', () => components.dashboardLocalMatch!, components.dashboardLocalMatch!));

    // Register layout strategies
    strategyRegistry.register(createComponentStrategy(SEAM_IDS.LAYOUT, 'property-panel', PropertyFormStrategy, components.propertyPanel!));
    strategyRegistry.register(createComponentStrategy(SEAM_IDS.LAYOUT, 'local-matches-panel', () => components.localMatchesPanel!, components.localMatchesPanel!));
}

export async function initializeStrategySystem(): Promise<void> {
    initializeProfiles();
    await registerUIStrategies();
}