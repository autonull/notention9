import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UisgGraph, UisgSurface } from './types.js';
import { getTemplate, type TemplateShape } from './templates/index.js';
import { TARGET_EXTENSION, type TemplateTarget } from './templates/render.js';
import { resolveSurface, type ResolvedSurface } from './resolve.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

export interface GeneratedSurface {
    surfaceId: string;
    target: TemplateTarget;
    path: string;
    content: string;
    testPath: string;
    test: string;
    propsSchemaPath: string;
    propsSchema: string;
    hash: string;
}

function hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

function getTemplateShape(surface: UisgSurface, graph?: UisgGraph): TemplateShape {
    if (surface.template && graph) {
        const templateNode = graph.nodes.find(n => n.id === `template.${surface.template}` || n.id === surface.template);
        if (templateNode && 'shape' in templateNode) {
            const shape = (templateNode as any).shape;
            // Map YAML template shapes to built-in template shapes
            const shapeMap: Record<string, TemplateShape> = {
                'panel': 'panel',
                'item': 'item',
                'editor': 'editor',
                'status': 'status',
            };
            if (shapeMap[shape]) return shapeMap[shape];
        }
    }
    
    const component = surface.component?.toLowerCase() ?? '';
    if (component.includes('item') || component.includes('list') || component.includes('card')) return 'item';
    if (component.includes('panel') || component.includes('rail') || component.includes('sidebar')) return 'panel';
    if (component.includes('editor') || component.includes('form') || component.includes('composer')) return 'editor';
    if (component.includes('status') || component.includes('badge') || component.includes('indicator') || component.includes('banner')) return 'status';
    
    return 'item';
}

export interface GenerateSurfaceOptions {
    target: TemplateTarget;
    write?: boolean;
    dryRun?: boolean;
}

function surfacePaths(surface: UisgSurface, shape: TemplateShape, target: TemplateTarget): { componentPath: string; testPath: string; propsSchemaPath: string } {
    const componentName = surface.component ?? surface.id.replace('surface.', '').replace(/-./g, m => m[1].toUpperCase());
    const category = (surface as any).category;
    if (target === 'react') {
        const shapePlural = shape === 'status' ? 'status' : `${shape}s`;
        const basePath = category ? `ui/src/components/${category}` : `ui/src/components/${shapePlural}`;
        return {
            componentPath: `${basePath}/${componentName}.tsx`,
            testPath: `ui/src/tests/generated/${componentName}.test.tsx`,
            propsSchemaPath: `${basePath}/${componentName}Props.ts`,
        };
    }
    return {
        componentPath: `ui/src/generated/${target}/${componentName}${TARGET_EXTENSION[target]}`,
        testPath: `ui/src/tests/generated/${componentName}.${target}.test.ts`,
        propsSchemaPath: `ui/src/generated/${target}/${componentName}Props.ts`,
    };
}

export interface GenerateSurfaceOptions {
    target: TemplateTarget;
    write?: boolean;
    dryRun?: boolean;
    variant?: string;
}

function createDynamicTemplate(surface: UisgSurface, graph: UisgGraph, shape: TemplateShape) {
    const templateNode = graph.nodes.find(n => n.id === `template.${surface.template}` || n.id === surface.template);
    if (templateNode && (templateNode as any).componentTemplate) {
        const componentTemplate = (templateNode as any).componentTemplate;
        const slots = (templateNode as any).slots || [];
        
        return {
            shape,
            name: surface.template,
            description: templateNode.name,
            generateComponent: (s: UisgSurface, g: UisgGraph, t: TemplateTarget) => {
                if (t !== 'react') {
                    return `// Custom template not supported for target: ${t}`;
                }
                const componentName = s.component ?? s.id.replace('surface.', '').replace(/-./g, m => m[1].toUpperCase());
                const testId = s.id.replace('surface.', '');
                // Replace template placeholders
                let content = componentTemplate
                    .replace(/\{\{componentName\}\}/g, componentName)
                    .replace(/\{\{surface\.id\}\}/g, s.id)
                    .replace(/\{\{surface\.name\}\}/g, s.name)
                    .replace(/\{\{testId\}\}/g, testId);
                // Add import for Props interface if not present
                if (!content.includes(`import { ${componentName}Props }`)) {
                    content = `import { ${componentName}Props } from './${componentName}Props';\n` + content;
                }
                return content;
            },
            generateTest: (s: UisgSurface, g: UisgGraph, t: TemplateTarget) => {
                if (t !== 'react') return `// Test not supported for target: ${t}`;
                const componentName = s.component ?? s.id.replace('surface.', '').replace(/-./g, m => m[1].toUpperCase());
                const category = (s as any).category;
                const importPath = category ? `../../components/${category}/${componentName}` : `../../components/${componentName}`;
                
                // Components that need full provider stack (useNotes, useHelp, useSettings, etc.)
                const needsFullProviderStack = s.template === 'inline-promo' || s.template === 'empty-state' || s.template === 'help-system' || s.template === 'settings-wizard';
                // Mobile components need NotesProvider + SettingsProvider for useMobile hooks
                const needsMobileProviders = s.template === 'modal-fullscreen' || s.template === 'bottom-sheet' || s.template === 'bottom-tabs' || s.template === 'map-full' || s.template === 'header-compact';
                const forceShow = s.template === 'inline-promo' ? ' forceShow={true}' : '';
                
                const allTemplatesNeedingMocks = needsFullProviderStack || needsMobileProviders;
                
                // Default props for components that need them
                const defaultProps: Record<string, string> = {
                  'ContextRailMobile': ' tabs={[{ id: \"tab1\", label: \"Tab 1\", panel: <div>Tab 1</div> }, { id: \"tab2\", label: \"Tab 2\", panel: <div>Tab 2</div> }]} activeIndex={0}',
                  'MapViewMobile': ' fabContent={<div>FAB</div>}',
                  'PropertyEditorMobile': ' header={<div>Header</div>} content={<div>Content</div>} footer={<div>Footer</div>}',
                  'ArrangeMenuMobile': ' onDismiss={() => {}} actions={<div>Actions</div>} children={<div>Content</div>}',
                  'HeaderMobile': ' onOpenSidebar={() => {}} logo={<div>Logo</div>} actions={<div>Actions</div>}',
                };
                
                const defaultProp = defaultProps[componentName] ?? '';
                
                const testImports = allTemplatesNeedingMocks ? `
import { NotesProvider } from '@/components/contexts/NotesContext';
import { SettingsProvider } from '@/components/contexts/SettingsContext';
import { ToastProvider } from '@/components/contexts/ToastProvider';
import { ViewProvider } from '@/components/contexts/ViewContext';
import { StrategyProvider } from '@/hooks/useStrategyResolver';
import { I18nProvider } from '@/components/i18n';
import { vi } from 'vitest';

// Mock hooks that require providers
vi.mock('@/hooks/data/useNotesData', () => ({
  useNotesData: () => ({
    notes: [],
    addNote: vi.fn(),
    deleteNote: vi.fn(),
    upsertNote: vi.fn(),
    updateNote: vi.fn(),
    restoreNote: vi.fn(),
    permanentlyDeleteNote: vi.fn(),
    notesLoading: false,
    getSortedFilteredNotes: vi.fn(() => []),
    isSyncing: false,
    lastSyncTime: null,
  }),
}));

vi.mock('@/hooks/useNotes', () => ({
  useNotes: () => ({
    notes: [],
    addNote: vi.fn(),
    deleteNote: vi.fn(),
    upsertNote: vi.fn(),
    updateNote: vi.fn(),
    restoreNote: vi.fn(),
    permanentlyDeleteNote: vi.fn(),
    notesLoading: false,
    getSortedFilteredNotes: vi.fn(() => []),
  }),
}));

vi.mock('@/hooks/useViewContext', () => ({
  useView: () => ({
    activeView: 'notes',
    setActiveView: vi.fn(),
    selectedNoteId: null,
    setSelectedNoteId: vi.fn(),
    searchTerm: '',
    sortOrder: 'updatedAt_desc',
    isSidebarOpen: true,
    setIsSidebarOpen: vi.fn(),
    userLocation: null,
    isPaletteOpen: false,
    setIsPaletteOpen: vi.fn(),
    isHelpOpen: false,
    setIsHelpOpen: vi.fn(),
    sidebarViewMode: 'list',
    setSidebarViewMode: vi.fn(),
    refreshUserLocation: vi.fn(),
    matchingNoteId: null,
    setMatchingNoteId: vi.fn(),
    selectedChatPubkey: null,
    setSelectedChatPubkey: vi.fn(),
    notificationCount: 0,
    matches: [],
    addMatch: vi.fn(),
    clearNotifications: vi.fn(),
    chatNotificationCount: 0,
    incrementChatNotification: vi.fn(),
    resetChatNotification: vi.fn(),
  }),
  useViewNavigation: () => ({
    navigate: vi.fn(),
    goBack: vi.fn(),
  }),
}));

vi.mock('@/hooks/useNetworkManagement', () => ({
  useNetworkManagement: vi.fn(),
}));

vi.mock('@/hooks/useSettingsContext', () => ({
  useSettings: () => ({
    groups: [
      { id: 'general', label: 'General', defaultExpanded: true, helpTopicId: 'settings-general', settings: [] },
      { id: 'editor', label: 'Editor', defaultExpanded: false, helpTopicId: 'settings-editor', settings: [] },
    ],
    searchQuery: '',
    setSearchQuery: vi.fn(),
    export: vi.fn(),
    import: vi.fn(),
    showDiff: vi.fn(),
    showWizard: false,
  }),
}));` : '';

const mobileMockImports = needsMobileProviders ? `
// Mock useMobile to return mobile state for testing
vi.mock('@/hooks/useMobile', () => ({
  useMobile: () => ({
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    hasTouch: true,
    orientation: 'portrait' as const,
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  }),
  useIsMobile: () => true,
  useIsTablet: () => false,
  useHasTouch: () => true,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));` : '';
                
                const wrapperStart = needsFullProviderStack ? `
      <I18nProvider>
        <SettingsProvider>
          <ToastProvider>
            <ViewProvider>
              <StrategyProvider>
                <NotesProvider>` : needsMobileProviders ? `
      <SettingsProvider>
        <NotesProvider>` : '';
                const wrapperEnd = needsFullProviderStack ? `
                </NotesProvider>
              </StrategyProvider>
            </ViewProvider>
          </ToastProvider>
        </SettingsProvider>
      </I18nProvider>` : needsMobileProviders ? `
        </NotesProvider>
      </SettingsProvider>` : '';
                
                return `// GENERATED by optimize/src/uisg/codegen.ts
// DO NOT EDIT MANUALLY
// Template: ${s.template}
// Source surface: ${s.id}

import { render, screen } from '@testing-library/react';
import { ${componentName} } from '${importPath}';
${testImports}
${mobileMockImports}

test('${s.id} renders', () => {
    render(
      ${wrapperStart}
        <${componentName}${forceShow}${defaultProp} />
      ${wrapperEnd}
    );
    expect(screen.getByTestId('${s.id.replace('surface.', '')}')).toBeInTheDocument();
});`;
            },
            generatePropsSchema: (s: UisgSurface, g: UisgGraph) => {
                const componentName = s.component ?? s.id.replace('surface.', '').replace(/-./g, m => m[1].toUpperCase());
                
                function inferPropType(propName: string): string {
                    const lower = propName.toLowerCase();
                    // Event handlers (onClick, onOpenSidebar, onDismiss, etc.)
                    if (lower.startsWith('on') && lower.length > 2) return '() => void';
                    // Refs
                    if (lower.includes('ref')) return 'React.RefObject<HTMLElement> | null';
                    // Children/content slots
                    if (lower === 'children' || lower === 'content' || lower === 'actions' || lower === 'logo' || lower === 'header' || lower === 'footer' || lower === 'panel' || lower === 'illustration' || lower === 'grabber' || lower === 'trigger' || lower === 'dismiss' || lower === 'fabcontent') return 'React.ReactNode';
                    // Tabs array
                    if (lower === 'tabs') return 'Array<{ id: string; label: string; panel: React.ReactNode }>';
                    // Variants/modes - specific known variants
                    if (lower === 'variant') return "'pulse' | 'tooltip' | 'contextual-hint'";
                    if (lower.includes('mode') || lower.includes('type')) return 'string';
                    // Booleans
                    if (lower.includes('show') || lower.includes('visible') || lower.includes('open') || lower.includes('enabled') || lower.includes('force') || lower === 'active') return 'boolean';
                    // Numbers
                    if (lower.includes('count') || lower.includes('index') || lower.includes('size') || lower.includes('length') || lower.includes('height') || lower.includes('width') || lower.includes('distance') || lower.includes('threshold')) return 'number';
                    // Action handlers (but not "actions" which is content)
                    if ((lower.includes('action') || lower.includes('handler') || lower.includes('callback') || lower.includes('dismiss')) && lower !== 'actions') return '() => void';
                    return 'unknown';
                }
                
                const slotProps = (slots as string[])
                    .map((slot: string) => {
                        // Convert kebab-case to camelCase for valid TS property names
                        const propName = slot.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
                        const type = inferPropType(propName);
                        return `    ${propName}?: ${type};`;
                    })
                    .join('\n');
                return `// GENERATED by optimize/src/uisg/codegen.ts
// DO NOT EDIT MANUALLY
// Template: ${s.template}
// Source surface: ${s.id}

export interface ${componentName}Props {
${slotProps}
}`;
            },
        };
    }
    return null;
}

export function generateSurface(surface: UisgSurface, graph: UisgGraph, options: GenerateSurfaceOptions): GeneratedSurface {
    const { target, write = true, dryRun = false, variant } = options;
    const resolvedSurface = resolveSurface(surface, variant);
    const shape = getTemplateShape(resolvedSurface, graph);
    
    // Try to use custom YAML template first
    const dynamicTemplate = createDynamicTemplate(resolvedSurface, graph, shape);
    const template = dynamicTemplate || getTemplate(shape);
    
    if (!template) {
        throw new Error(`No template found for shape: ${shape}`);
    }

    const componentContent = template.generateComponent(surface, graph, target);
    const testContent = template.generateTest(surface, graph, target);
    const propsSchemaContent = template.generatePropsSchema(surface, graph);

    const { componentPath, testPath, propsSchemaPath } = surfacePaths(surface, shape, target);

    const fullComponentPath = resolve(ROOT, componentPath);
    const fullTestPath = resolve(ROOT, testPath);
    const fullPropsSchemaPath = resolve(ROOT, propsSchemaPath);

    if (write && !dryRun) {
        mkdirSync(dirname(fullComponentPath), { recursive: true });
        mkdirSync(dirname(fullTestPath), { recursive: true });
        mkdirSync(dirname(fullPropsSchemaPath), { recursive: true });

        writeFileSync(fullComponentPath, componentContent);
        writeFileSync(fullTestPath, testContent);
        writeFileSync(fullPropsSchemaPath, propsSchemaContent);
    }

    const combined = componentContent + testContent + propsSchemaContent;
    const hash = hashContent(combined);

    return {
        surfaceId: surface.id,
        target,
        path: componentPath,
        content: componentContent,
        testPath,
        test: testContent,
        propsSchemaPath,
        propsSchema: propsSchemaContent,
        hash,
    };
}

export function generateSurfaceInMemory(surface: UisgSurface, graph: UisgGraph, target: TemplateTarget, variant?: string): GeneratedSurface {
    return generateSurface(surface, graph, { target, write: false, dryRun: true, variant });
}

export interface ParityResult {
    surfaceId: string;
    deterministic: boolean;
    hasOriginal: boolean;
    originalMatches: boolean;
    differences: string[];
    generatedHash: string;
    onDiskHash: string;
    originalHash: string;
}

function normalizeForComparison(content: string): string {
    return content
        .replace(/\/\/ GENERATED by .*?\n/g, '')
        .replace(/\/\/ DO NOT EDIT MANUALLY\n/g, '')
        .replace(/\/\/ Template: .*?\n/g, '')
        .replace(/\/\/ Source surface: .*?\n/g, '')
        .replace(/\/\/ AUTO-GENERATED by .*?\n/g, '')
        .trim();
}

function extractTestIds(content: string): Set<string> {
    const ids = new Set<string>();
    for (const [, id] of content.matchAll(/data-testid="([^"]+)"/g)) ids.add(id);
    for (const [, id] of content.matchAll(/\btestId="([^"]+)"/g)) ids.add(id);
    return ids;
}

function compareTestIds(a: Set<string>, b: Set<string>): string[] {
    const diffs: string[] = [];
    for (const id of a) if (!b.has(id)) diffs.push(`Missing testId: ${id}`);
    for (const id of b) if (!a.has(id)) diffs.push(`Extra testId: ${id}`);
    return diffs;
}

function readOriginalSource(surface: UisgSurface): string | null {
    if (!surface.source || surface.source.length === 0) return null;
    const sourcePath = resolve(ROOT, surface.source[0]);
    if (!existsSync(sourcePath)) return null;
    return readFileSync(sourcePath, 'utf8');
}

export function checkParity(surface: UisgSurface, graph: UisgGraph, variant?: string): ParityResult {
    const generated = generateSurfaceInMemory(surface, graph, 'react', variant);
    
    // Check determinism: compare with on-disk
    const onDiskComponent = existsSync(resolve(ROOT, generated.path)) 
        ? readFileSync(resolve(ROOT, generated.path), 'utf8') 
        : null;
    const onDiskTest = existsSync(resolve(ROOT, generated.testPath)) 
        ? readFileSync(resolve(ROOT, generated.testPath), 'utf8') 
        : null;
    const onDiskPropsSchema = existsSync(resolve(ROOT, generated.propsSchemaPath)) 
        ? readFileSync(resolve(ROOT, generated.propsSchemaPath), 'utf8') 
        : null;
    
    const onDiskCombined = (onDiskComponent ?? '') + (onDiskTest ?? '') + (onDiskPropsSchema ?? '');
    const onDiskHash = onDiskCombined ? hashContent(onDiskCombined) : '';
    const deterministic = onDiskHash === generated.hash;
    
    // Check parity with original source
    const originalSource = readOriginalSource(surface);
    const hasOriginal = originalSource !== null;
    let originalMatches = false;
    let originalHash = '';
    const differences: string[] = [];
    
    if (hasOriginal && originalSource) {
        originalHash = hashContent(originalSource);
        // For parity, we compare test IDs and key structural elements
        const genTestIds = extractTestIds(generated.content);
        const origTestIds = extractTestIds(originalSource);
        const testIdDiffs = compareTestIds(genTestIds, origTestIds);
        differences.push(...testIdDiffs);
        
        // Compare component structure (simplified)
        const genNormalized = normalizeForComparison(generated.content);
        const origNormalized = normalizeForComparison(originalSource);
        
        // Check for major structural differences
        if (genNormalized.length === 0 || origNormalized.length === 0) {
            differences.push('Empty normalized content');
        } else if (genNormalized !== origNormalized) {
            // This is expected - generated uses templates, original may be hand-written
            // We just record the difference, don't fail
            differences.push('Component structure differs from original (template vs hand-written)');
        }
        
        originalMatches = testIdDiffs.length === 0;
    }
    
    // Also check on-disk vs generated test IDs
    if (onDiskComponent) {
        const diskTestIds = extractTestIds(onDiskComponent);
        const genTestIds = extractTestIds(generated.content);
        const diskDiffs = compareTestIds(genTestIds, diskTestIds);
        if (diskDiffs.length > 0) {
            differences.push(...diskDiffs.map(d => `On-disk: ${d}`));
        }
    }
    
    return {
        surfaceId: surface.id,
        deterministic,
        hasOriginal,
        originalMatches,
        differences,
        generatedHash: generated.hash,
        onDiskHash,
        originalHash,
    };
}

export function checkAllParity(graph: UisgGraph, surfaceIds?: string[], variant?: string): ParityResult[] {
    const surfaces = graph.nodes.filter(node => node.type === 'surface') as UisgSurface[];
    const targets = surfaceIds 
        ? surfaces.filter(s => surfaceIds.includes(s.id))
        : surfaces.filter(s => s.status === 'implemented' || s.status === 'partial');
    
    const results: ParityResult[] = [];
    
    for (const surface of targets) {
        if (surface.seam) continue;
        // Skip parity check for hand-written components (no template field)
        if (!surface.template) continue;
        try {
            const result = checkParity(surface, graph, variant);
            results.push(result);
        } catch (error) {
            results.push({
                surfaceId: surface.id,
                deterministic: false,
                hasOriginal: false,
                originalMatches: false,
                differences: [`Error: ${error}`],
                generatedHash: '',
                onDiskHash: '',
                originalHash: '',
            });
        }
    }
    
    return results;
}

export function generateAllSurfaces(graph: UisgGraph, target: TemplateTarget, surfaceIds?: string[], variant?: string): GeneratedSurface[] {
    const surfaces = graph.nodes.filter(node => node.type === 'surface') as UisgSurface[];
    const targets = surfaceIds 
        ? surfaces.filter(s => surfaceIds.includes(s.id))
        : surfaces.filter(s => s.status === 'implemented' || s.status === 'partial' || s.status === 'planned');
    
    const generated: GeneratedSurface[] = [];
    
    for (const surface of targets) {
        if (surface.seam) continue; // Skip strategy-backed surfaces
        try {
            const result = generateSurface(surface, graph, { target, variant });
            generated.push(result);
            console.log(`Generated ${result.path}${variant ? ` (variant: ${variant})` : ''}`);
        } catch (error) {
            console.error(`Failed to generate ${surface.id}: ${error}`);
        }
    }
    
    return generated;
}