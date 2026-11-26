import React, { Suspense, useState } from 'react';
import { Card } from '../components/ui/Primitives';
import { Button } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/kit';

// Generated item components
const MatchItem = React.lazy(() => import('../components/items/MatchItem').then(m => ({ default: m.MatchItem })));
const SaveState = React.lazy(() => import('../components/items/SaveState').then(m => ({ default: m.SaveState })));
const Toast = React.lazy(() => import('../components/items/Toast').then(m => ({ default: m.Toast })));
const CommandPalette = React.lazy(() => import('../components/items/CommandPalette').then(m => ({ default: m.CommandPalette })));
const EmptyState = React.lazy(() => import('../components/items/EmptyState').then(m => ({ default: m.EmptyState })));
const LoadingSpinner = React.lazy(() => import('../components/items/LoadingSpinner').then(m => ({ default: m.LoadingSpinner })));
const ConfirmationModal = React.lazy(() => import('../components/items/ConfirmationModal').then(m => ({ default: m.ConfirmationModal })));
const QuickCapture = React.lazy(() => import('../components/items/QuickCapture').then(m => ({ default: m.QuickCapture })));
const TagInput = React.lazy(() => import('../components/items/TagInput').then(m => ({ default: m.TagInput })));
const TemplateSelector = React.lazy(() => import('../components/items/TemplateSelector').then(m => ({ default: m.TemplateSelector })));
const SettingsView = React.lazy(() => import('../components/items/SettingsView').then(m => ({ default: m.SettingsView })));
const MainView = React.lazy(() => import('../components/items/MainView').then(m => ({ default: m.MainView })));
const AutomationsView = React.lazy(() => import('../components/items/AutomationsView').then(m => ({ default: m.AutomationsView })));
const OntologyView = React.lazy(() => import('../components/items/OntologyView').then(m => ({ default: m.OntologyView })));
const NotesView = React.lazy(() => import('../components/items/NotesView').then(m => ({ default: m.NotesView })));
const PageSurface = React.lazy(() => import('../components/items/PageSurface').then(m => ({ default: m.PageSurface })));
const MobileCapture = React.lazy(() => import('../components/items/MobileCapture').then(m => ({ default: m.MobileCapture })));
const RejectedDisplay = React.lazy(() => import('../components/items/RejectedDisplay').then(m => ({ default: m.RejectedDisplay })));
const NoMatch = React.lazy(() => import('../components/items/NoMatch').then(m => ({ default: m.NoMatch })));
const PublishReady = React.lazy(() => import('../components/items/PublishReady').then(m => ({ default: m.PublishReady })));
const PermissionDenied = React.lazy(() => import('../components/items/PermissionDenied').then(m => ({ default: m.PermissionDenied })));
const ErrorDisplay = React.lazy(() => import('../components/items/ErrorDisplay').then(m => ({ default: m.ErrorDisplay })));
const AppShell = React.lazy(() => import('../components/items/AppShell').then(m => ({ default: m.AppShell })));
const SkillManagementView = React.lazy(() => import('../components/items/SkillManagementView').then(m => ({ default: m.SkillManagementView })));
const MapView = React.lazy(() => import('../components/items/MapView').then(m => ({ default: m.MapView })));
const NetworkView = React.lazy(() => import('../components/items/NetworkView').then(m => ({ default: m.NetworkView })));
const TimelineView = React.lazy(() => import('../components/items/TimelineView').then(m => ({ default: m.TimelineView })));
const ConditionalAutomationView = React.lazy(() => import('../components/items/ConditionalAutomationView').then(m => ({ default: m.ConditionalAutomationView })));

// Generated panel components
const LocalMatchesPanel = React.lazy(() => import('../components/panels/LocalMatchesPanel').then(m => ({ default: m.LocalMatchesPanel })));
const NoteContextRail = React.lazy(() => import('../components/panels/NoteContextRail').then(m => ({ default: m.NoteContextRail })));
const NoteHistoryRail = React.lazy(() => import('../components/panels/NoteHistoryRail').then(m => ({ default: m.NoteHistoryRail })));

// Generated editor components
const EditorManager = React.lazy(() => import('../components/editors/EditorManager').then(m => ({ default: m.EditorManager })));
const PropertyEditor = React.lazy(() => import('../components/editors/PropertyEditor').then(m => ({ default: m.PropertyEditor })));
const DescribeItComposer = React.lazy(() => import('../components/editors/DescribeItComposer').then(m => ({ default: m.DescribeItComposer })));

// Generated status components
const DegradedBanner = React.lazy(() => import('../components/status/DegradedBanner').then(m => ({ default: m.DegradedBanner })));
const OfflineBanner = React.lazy(() => import('../components/status/OfflineBanner').then(m => ({ default: m.OfflineBanner })));
const ExtractionStatus = React.lazy(() => import('../components/status/ExtractionStatus').then(m => ({ default: m.ExtractionStatus })));

interface GalleryItem {
    name: string;
    component: React.LazyExoticComponent<React.ComponentType<any>>;
    defaultProps: Record<string, unknown>;
    description: string;
}

const itemGallery: GalleryItem[] = [
    {
        name: 'MatchItem',
        component: MatchItem,
        defaultProps: {
            match: {
                note: { id: 'n1', title: 'React developer in Berlin', content: 'Looking for React dev', author: 'user1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', tags: [], properties: [] },
                result: { score: 0.92, matches: [], conflicts: [], missing: [] },
                direction: 'incoming',
            },
            isLocal: false,
            isContact: false,
        },
        description: 'Match result card with score, explanations, and actions',
    },
    {
        name: 'SaveState',
        component: SaveState,
        defaultProps: {
            match: {
                note: { id: 'n2', title: 'Saved note', content: 'Content here', author: 'user2', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', tags: [], properties: [] },
                result: { score: 0.85, matches: [], conflicts: [], missing: [] },
                direction: 'outgoing',
            },
            isLocal: true,
        },
        description: 'Local match card with respond action',
    },
    {
        name: 'Toast',
        component: Toast,
        defaultProps: {
            message: 'Note saved successfully',
            tone: 'success',
            onDismiss: () => {},
        },
        description: 'Toast notification with tone variants',
    },
    {
        name: 'CommandPalette',
        component: CommandPalette,
        defaultProps: {
            isOpen: true,
            onClose: () => {},
            onSelect: () => {},
        },
        description: 'Command palette with search and actions',
    },
    {
        name: 'EmptyState',
        component: EmptyState,
        defaultProps: {
            title: 'No matches found',
            description: 'Create a note to start matching',
            actionLabel: 'New note',
            onAction: () => {},
        },
        description: 'Empty state with illustration and CTA',
    },
    {
        name: 'LoadingSpinner',
        component: LoadingSpinner,
        defaultProps: {
            match: {
                note: { id: 'n3', title: 'Match', content: 'Content', author: 'user3', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', tags: [], properties: [] },
                result: { score: 0.7, matches: [], conflicts: [], missing: [] },
                direction: 'incoming',
            },
            isLocal: false,
        },
        description: 'Match result card',
    },
    {
        name: 'ConfirmationModal',
        component: ConfirmationModal,
        defaultProps: {
            isOpen: true,
            onClose: () => {},
            onConfirm: () => {},
            title: 'Delete note?',
            message: 'This action cannot be undone.',
            isDestructive: true,
        },
        description: 'Confirmation dialog with destructive variant',
    },
    {
        name: 'QuickCapture',
        component: QuickCapture,
        defaultProps: {
            onSubmit: () => {},
            onCancel: () => {},
        },
        description: 'Quick capture input with submit/cancel',
    },
    {
        name: 'TagInput',
        component: TagInput,
        defaultProps: {
            value: ['react', 'typescript'],
            onChange: () => {},
            placeholder: 'Add tags…',
        },
        description: 'Tag input with autocomplete and chips',
    },
    {
        name: 'TemplateSelector',
        component: TemplateSelector,
        defaultProps: {
            templates: [],
            onSelect: () => {},
        },
        description: 'Template selector grid',
    },
    {
        name: 'SettingsView',
        component: SettingsView,
        defaultProps: {
            sections: [],
            activeSection: 'appearance',
            onSectionChange: () => {},
        },
        description: 'Settings view with sidebar navigation',
    },
    {
        name: 'MainView',
        component: MainView,
        defaultProps: {
            notes: [],
            onNoteSelect: () => {},
            onNewNote: () => {},
        },
        description: 'Main notes list view',
    },
    {
        name: 'AutomationsView',
        component: AutomationsView,
        defaultProps: {
            automations: [],
            onCreate: () => {},
            onEdit: () => {},
        },
        description: 'Automation rules list and editor',
    },
    {
        name: 'OntologyView',
        component: OntologyView,
        defaultProps: {
            properties: [],
            conflicts: [],
            onMerge: () => {},
        },
        description: 'Ontology property management with conflicts',
    },
    {
        name: 'NotesView',
        component: NotesView,
        defaultProps: {
            notes: [],
            onSelect: () => {},
        },
        description: 'Notes list with grouping and sorting',
    },
    {
        name: 'PageSurface',
        component: PageSurface,
        defaultProps: {
            children: null,
        },
        description: 'Page layout surface with chrome',
    },
    {
        name: 'MobileCapture',
        component: MobileCapture,
        defaultProps: {
            onSubmit: () => {},
        },
        description: 'Mobile-optimized capture interface',
    },
    {
        name: 'RejectedDisplay',
        component: RejectedDisplay,
        defaultProps: {
            reason: 'Does not match criteria',
            onDismiss: () => {},
        },
        description: 'Rejected match display with reason',
    },
    {
        name: 'NoMatch',
        component: NoMatch,
        defaultProps: {
            onCreateOffer: () => {},
        },
        description: 'No match found state with create offer CTA',
    },
    {
        name: 'PublishReady',
        component: PublishReady,
        defaultProps: {
            note: { id: 'n3', title: 'Ready to publish', content: 'Content', author: 'user', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', tags: [], properties: [] },
            onPublish: () => {},
        },
        description: 'Publish-ready note confirmation',
    },
    {
        name: 'PermissionDenied',
        component: PermissionDenied,
        defaultProps: {
            permission: 'publish_note',
            onRequestAccess: () => {},
        },
        description: 'Permission denied state with request access',
    },
    {
        name: 'ErrorDisplay',
        component: ErrorDisplay,
        defaultProps: {
            error: new Error('Something went wrong'),
            onRetry: () => {},
        },
        description: 'Error display with retry action',
    },
    {
        name: 'AppShell',
        component: AppShell,
        defaultProps: {
            children: null,
        },
        description: 'Application shell with navigation',
    },
    {
        name: 'SkillManagementView',
        component: SkillManagementView,
        defaultProps: {
            skills: [],
            onInstall: () => {},
        },
        description: 'Skill marketplace and management',
    },
    {
        name: 'MapView',
        component: MapView,
        defaultProps: {
            locations: [],
            onSelect: () => {},
        },
        description: 'Geographic map view',
    },
    {
        name: 'NetworkView',
        component: NetworkView,
        defaultProps: {
            nodes: [],
            edges: [],
        },
        description: 'Network graph visualization',
    },
    {
        name: 'TimelineView',
        component: TimelineView,
        defaultProps: {
            events: [],
        },
        description: 'Timeline event visualization',
    },
    {
        name: 'ConditionalAutomationView',
        component: ConditionalAutomationView,
        defaultProps: {
            conditions: [],
            actions: [],
            onSave: () => {},
        },
        description: 'Conditional automation rule builder',
    },
];

const panelGallery: GalleryItem[] = [
    {
        name: 'LocalMatchesPanel',
        component: LocalMatchesPanel,
        defaultProps: {
            matches: [],
            onSelect: () => {},
        },
        description: 'Panel showing local match results',
    },
    {
        name: 'NoteContextRail',
        component: NoteContextRail,
        defaultProps: {
            note: { id: 'n1', title: 'Note title', content: 'Content', author: 'user', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', tags: [], properties: [] },
            onAction: () => {},
        },
        description: 'Context rail for note details and actions',
    },
    {
        name: 'NoteHistoryRail',
        component: NoteHistoryRail,
        defaultProps: {
            history: [],
        },
        description: 'History rail showing note revisions',
    },
];

const editorGallery: GalleryItem[] = [
    {
        name: 'EditorManager',
        component: EditorManager,
        defaultProps: {
            note: { id: 'n1', title: '', content: '', author: 'user', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', tags: [], properties: [] },
            onSave: () => {},
            onCancel: () => {},
        },
        description: 'Main editor manager with toolbar',
    },
    {
        name: 'PropertyEditor',
        component: PropertyEditor,
        defaultProps: {
            properties: [],
            onChange: () => {},
        },
        description: 'Property editor for note metadata',
    },
    {
        name: 'DescribeItComposer',
        component: DescribeItComposer,
        defaultProps: {
            value: '',
            onChange: () => {},
        },
        description: 'Natural language composer with suggestions',
    },
];

const statusGallery: GalleryItem[] = [
    {
        name: 'DegradedBanner',
        component: DegradedBanner,
        defaultProps: {
            message: 'Running in degraded mode',
            onDismiss: () => {},
        },
        description: 'Degraded mode banner',
    },
    {
        name: 'OfflineBanner',
        component: OfflineBanner,
        defaultProps: {
            message: 'You are offline',
            onRetry: () => {},
        },
        description: 'Offline status banner with retry',
    },
    {
        name: 'ExtractionStatus',
        component: ExtractionStatus,
        defaultProps: {
            progress: 0.65,
            stage: 'analyzing',
        },
        description: 'Extraction progress indicator',
    },
];

function GallerySection({ title, description, items }: { title: string; description: string; items: GalleryItem[] }) {
    const [expanded, setExpanded] = useState(true);
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <SectionHeader title={title} description={description} />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    aria-expanded={expanded}
                >
                    {expanded ? 'Collapse' : 'Expand'}
                </Button>
            </div>
            {expanded && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map(({ name, component: Component, defaultProps, description }) => (
                        <Card key={name} className="p-4 flex flex-col" data-testid={`gallery-${name.toLowerCase()}`}>
                            <header className="mb-3">
                                <h3 className="font-medium text-sm">{name}</h3>
                                <p className="text-xs text-[var(--app-faint)] mt-0.5">{description}</p>
                            </header>
                            <div className="flex-1 min-h-[120px] flex items-center justify-center">
                                <Suspense fallback={<div className="text-xs text-[var(--app-muted)]">Loading {name}…</div>}>
                                    <Component {...defaultProps} />
                                </Suspense>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}

export default function GeneratedSurfaceGallery() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    const applyTheme = (next: 'dark' | 'light') => {
        setTheme(next);
        document.documentElement.dataset.theme = next;
    };

    return (
        <div className="min-h-screen bg-[var(--app-bg)] px-6 py-8 text-[var(--app-text)]">
            <header className="mb-8 flex flex-wrap items-center gap-3 border-b border-[var(--app-line)] pb-4">
                <div className="mr-auto">
                    <h1 className="text-lg font-semibold">Generated surface gallery</h1>
                    <p className="text-sm text-[var(--app-muted)]">All template-generated surfaces (item, panel, editor, status) with fixed fixtures. No app state.</p>
                </div>
                <Button variant={theme === 'dark' ? 'primary' : 'secondary'} size="sm" onClick={() => applyTheme('dark')}>Dark</Button>
                <Button variant={theme === 'light' ? 'primary' : 'secondary'} size="sm" onClick={() => applyTheme('light')}>Light</Button>
            </header>

            <div className="space-y-10 max-w-6xl mx-auto">
                <GallerySection
                    title="Item surfaces"
                    description="Card-like components for list items, match results, and discrete content units"
                    items={itemGallery}
                />
                <GallerySection
                    title="Panel surfaces"
                    description="Sidebar/rail components for contextual information and navigation"
                    items={panelGallery}
                />
                <GallerySection
                    title="Editor surfaces"
                    description="Composable editing components for note creation and property editing"
                    items={editorGallery}
                />
                <GallerySection
                    title="Status surfaces"
                    description="System status indicators, banners, and progress displays"
                    items={statusGallery}
                />
            </div>
        </div>
    );
}