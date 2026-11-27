import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { ROOT } from './paths.js';


// Cache for scanAll with mtime-based invalidation
let _cachedScanResult: ScanResult | null = null;
let _cachedScanMtime: number = 0;

export interface ScanResult {
    version: number;
    scannedAt: string;
    surfaces: ScannedSurface[];
    navigation: ScannedNavigation[];
    seams: ScannedSeam[];
    journeys: ScannedJourney[];
    strategies: ScannedStrategy[];
    components: ScannedComponent[];
    taxonomy: ScannedTaxonomy[];
    goldenCases: ScannedGoldenCase[];
    loopRuns: ScannedLoopRun[];
}

export interface ScannedSurface {
    id: string;
    component: string;
    route?: string;
    configKey?: string;
    file: string;
    exports: string[];
}

export interface ScannedNavigation {
    view: string;
    hash: string;
    component?: string;
    file: string;
}

export interface ScannedSeam {
    role: string;
    strategies: string[];
    file: string;
}

export interface ScannedJourney {
    id: string;
    version: number;
    intent: string;
    status: string;
    steps: number;
    file: string;
}

export interface ScannedStrategy {
    id: string;
    seam: string;
    component: string;
    file: string;
}

export interface ScannedComponent {
    name: string;
    file: string;
    exports: string[];
}

export interface ScannedTaxonomy {
    domain: string;
    terms: string[];
    file: string;
}

export interface ScannedGoldenCase {
    id: string;
    domain: string;
    file: string;
}

export interface ScannedLoopRun {
    runId: string;
    journeyId: string;
    status: string;
    durationMs: number;
    file: string;
}

function walkDir(dir: string, filter: (file: string) => boolean): string[] {
    const results: string[] = [];
    if (!statSync(dir).isDirectory()) return results;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkDir(path, filter));
        } else if (filter(entry.name)) {
            results.push(path);
        }
    }
    return results;
}

function extractExports(source: string): string[] {
    const exports: string[] = [];
    const patterns = [
        /export\s+(?:const|function|class)\s+(\w+)/g,
        /export\s+default\s+(\w+)/g,
        /export\s*\{\s*([^}]+)\s*\}/g,
    ];
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            const names = match[1].split(',').map(s => s.trim()).filter(Boolean);
            exports.push(...names);
        }
    }
    return [...new Set(exports)];
}

function loadStrategyConfigs(): any[] {
    const configFile = resolve(ROOT, 'core/src/schemas/generated/seam-definitions.ts');
    if (!statSync(configFile, { throwIfNoEntry: false })?.isFile()) return [];
    const source = readFileSync(configFile, 'utf8');
    
    // Find the start of the STRATEGY_CONFIGS array (with or without type annotation)
    const startMatch = source.match(/export const STRATEGY_CONFIGS[^=]*= \[/);
    if (!startMatch || startMatch.index === undefined) return [];
    
    const startIdx = startMatch.index + startMatch[0].length - 1;
    let braceCount = 1;
    let endIdx = startIdx + 1;
    while (endIdx < source.length && braceCount > 0) {
        if (source[endIdx] === '[') braceCount++;
        else if (source[endIdx] === ']') braceCount--;
        endIdx++;
    }
    
    const configsStr = source.substring(startIdx, endIdx);
    
    try {
        const configs = new Function('return ' + configsStr)();
        return configs;
    } catch {
        return [];
    }
}

function loadSeamDefinitions(): any[] {
    const configFile = resolve(ROOT, 'core/src/schemas/generated/seam-definitions.ts');
    if (!statSync(configFile, { throwIfNoEntry: false })?.isFile()) return [];
    const source = readFileSync(configFile, 'utf8');
    
    // Find the start of the array (with or without type annotation)
    const startMatch = source.match(/export const SEAM_DEFINITIONS[^=]*= \[/);
    if (!startMatch || startMatch.index === undefined) return [];
    
    const startIdx = startMatch.index + startMatch[0].length - 1; // Include the opening bracket
    let braceCount = 1;
    let endIdx = startIdx + 1;
    while (endIdx < source.length && braceCount > 0) {
        if (source[endIdx] === '[') braceCount++;
        else if (source[endIdx] === ']') braceCount--;
        endIdx++;
    }
    
    const defsStr = source.substring(startIdx, endIdx);
    
    try {
        const defs = new Function('return ' + defsStr)();
        return defs;
    } catch {
        return [];
    }
}

export function scanSurfaces(): ScannedSurface[] {
    const surfaces: ScannedSurface[] = [];
    
    // Use strategy configs as authoritative source for surfaces (they reference components)
    const configs = loadStrategyConfigs();
    for (const config of configs) {
        if (config.componentPath && config.componentName) {
            const filePath = config.componentPath.startsWith('../') 
                ? resolve(ROOT, 'ui/src', config.componentPath.replace('../', '') + '.tsx')
                : resolve(ROOT, config.componentPath + '.tsx');
            
            if (statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
                surfaces.push({
                    id: `surface.${config.componentName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                    component: config.componentName,
                    file: filePath.replace(ROOT + '/', ''),
                    exports: [config.componentName],
                });
            }
        }
    }
    
    // Also scan for page-level surfaces (Views, Pages, etc.) and common UI components
    const uiFiles = walkDir(resolve(ROOT, 'ui/src'), f => 
        f.endsWith('View.tsx') || f.endsWith('Page.tsx') || f.endsWith('Shell.tsx') || 
        f.endsWith('Rail.tsx') || f.endsWith('Panel.tsx') || f.endsWith('Dialog.tsx') ||
        f.endsWith('Modal.tsx') || f.endsWith('Status.tsx') || f.endsWith('State.tsx') ||
        f.endsWith('Editor.tsx') || f.endsWith('Manager.tsx') || f.endsWith('Composer.tsx') ||
        f.endsWith('Selector.tsx') || f.endsWith('Input.tsx') || f.endsWith('Banner.tsx') ||
        f.endsWith('Display.tsx') || f.endsWith('Spinner.tsx') || f.endsWith('Capture.tsx') ||
        f.endsWith('Toast.tsx') || f.endsWith('Picker.tsx') || f.endsWith('List.tsx') ||
        f.endsWith('Item.tsx') || f.endsWith('Palette.tsx')
    );
    
    // Primitive components to exclude (these are not "surfaces" in UISG sense)
    const primitiveComponents = new Set([
        'Input', 'Button', 'Modal', 'Select', 'Textarea', 'Label', 'Checkbox', 'Radio',
        'Switch', 'Slider', 'Tooltip', 'Popover', 'Dropdown', 'Menu', 'Tabs', 'Card',
        'Badge', 'Avatar', 'Icon', 'Spinner', 'Skeleton', 'Divider', 'Separator',
        'StatItem', 'TimePickerModal', 'InputModal', 'PendingConfirmationsModal',
        'HelpDialog', 'LmConsentModal', 'PrivacyConfirmModal', 'SkillApprovalDialog',
        'AttributeEditorModal', 'OntologyAliasLinkModal', 'MapPickerModal', 'SaveTemplateModal',
        'SuggestionList', 'ContactList', 'ChatPanel', 'AgentStatus', 'ConnectionStatus',
        'PublishErrorBanner', 'ConnectivityBanner', 'DegradedModeBanner', 'CapabilitiesPanel',
        'NoteGridItem', 'NoteListItem', 'NetworkFeedList', 'SuggestedMatchItem',
        'OntologyNodeItem', 'OntologySuggestionItem', 'EnhancedPropertyValueInput',
        'LanguageSelector', 'TiptapEditor', 'HybridEditor', 'MatchList',
        'AttributeList'
    ]);
    
    for (const file of uiFiles) {
        const source = readFileSync(file, 'utf8');
        const exports = extractExports(source);
        const uiExports = exports.filter(e =>
            e[0] === e[0].toUpperCase() &&
            !primitiveComponents.has(e) &&
            (e.endsWith('View') || e.endsWith('Page') || e.endsWith('Shell') || 
             e.endsWith('Rail') || e.endsWith('Panel') || e.endsWith('Dialog') || 
             e.endsWith('Modal') || e.endsWith('Status') || e.endsWith('State') ||
             e.endsWith('Editor') || e.endsWith('Manager') || e.endsWith('Composer') ||
             e.endsWith('Selector') || e.endsWith('Input') || e.endsWith('Banner') ||
             e.endsWith('Display') || e.endsWith('Spinner') || e.endsWith('Capture') ||
             e.endsWith('Toast') || e.endsWith('Picker') || e.endsWith('List') ||
             e.endsWith('Rail') || e.endsWith('Item') || e.endsWith('Empty') ||
             e.endsWith('Error') || e.endsWith('Match') || e.endsWith('Confirm') ||
             e.endsWith('Palette'))
        );
        
        for (const name of uiExports) {
            if (!surfaces.some(s => s.component === name)) {
                surfaces.push({
                    id: `surface.${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                    component: name,
                    file: file.replace(ROOT + '/', ''),
                    exports: [name],
                });
            }
        }
    }
    
    return surfaces;
}

export function scanNavigation(): ScannedNavigation[] {
    const navigation: ScannedNavigation[] = [];

    // Scan navigation.ts for route definitions
    const navFile = resolve(ROOT, 'ui/src/utils/navigation.ts');
    if (statSync(navFile, { throwIfNoEntry: false })?.isFile()) {
        const source = readFileSync(navFile, 'utf8');
        
        // Extract SETTINGS_TABS - only add base route for settings
        const settingsTabsMatch = source.match(/SETTINGS_TABS:\s*SettingsTab\[\]\s*=\s*(\[[\s\S]*?\]);/);
        if (settingsTabsMatch) {
            try {
                const tabs = new Function('return ' + settingsTabsMatch[1])();
                // Only add base settings route and individual setting pages (not tabs as separate routes)
                navigation.push({ view: 'settings', hash: '#/settings', file: 'ui/src/utils/navigation.ts' });
                for (const tab of tabs) {
                    if (tab !== 'general') {
                        navigation.push({
                            view: 'settings',
                            hash: `#/settings/${tab}`,
                            file: 'ui/src/utils/navigation.ts',
                        });
                    }
                }
            } catch {}
        }
        
        // Extract NOTE_TABS - only add base route for notes
        const noteTabsMatch = source.match(/NOTE_TABS:\s*NoteTab\[\]\s*=\s*(\[[\s\S]*?\]);/);
        if (noteTabsMatch) {
            try {
                // Only add base notes route (tabs are URL params, not separate routes)
                navigation.push({ view: 'notes', hash: '#/notes', file: 'ui/src/utils/navigation.ts' });
            } catch {}
        }
        
        // Add other known routes from the codebase
        navigation.push({ view: 'notes', hash: '#/notes?mode=map', file: 'ui/src/utils/navigation.ts' });
        navigation.push({ view: 'notes', hash: '#/notes?mode=timeline', file: 'ui/src/utils/navigation.ts' });
        navigation.push({ view: 'notes', hash: '#/notes?explore=1', file: 'ui/src/utils/navigation.ts' });
    }
    
    return navigation;
}

export function scanSeams(): ScannedSeam[] {
    const seams: ScannedSeam[] = [];
    const defs = loadSeamDefinitions();
    
    for (const def of defs) {
        const strategies = def.components || [];
        seams.push({
            role: def.role,
            strategies,
            file: 'core/src/schemas/generated/seam-definitions.ts',
        });
    }
    
    return seams;
}

export function scanJourneys(): ScannedJourney[] {
    const journeys: ScannedJourney[] = [];

    // Scan knownJourneys.ts
    const knownJourneysFile = resolve(ROOT, 'optimize/src/knownJourneys.ts');
    if (statSync(knownJourneysFile, { throwIfNoEntry: false })?.isFile()) {
        const source = readFileSync(knownJourneysFile, 'utf8');
        const keyMatches = source.matchAll(/['"]([\w-]+)['"]:\s*\{/g);
        
        for (const keyMatch of keyMatches) {
            const key = keyMatch[1];
            const startIdx = keyMatch.index + keyMatch[0].length;
            let braceCount = 1;
            let endIdx = startIdx;
            while (endIdx < source.length && braceCount > 0) {
                if (source[endIdx] === '{') braceCount++;
                else if (source[endIdx] === '}') braceCount--;
                endIdx++;
            }
            const journeySource = source.substring(startIdx, endIdx - 1);
            const idMatch = journeySource.match(/id:\s*['"]([\w-]+)['"]/);
            const intentMatch = journeySource.match(/intent:\s*['"]([^'"]+)['"]/);
            const statusMatch = journeySource.match(/status:\s*['"](\w+)['"]/);
            const stepsMatch = journeySource.match(/steps:\s*\[([\s\S]*?)\]/);
            
            if (idMatch) {
                const steps = (stepsMatch?.[1]?.match(/['"]kind['"]/g) ?? []).length;
                journeys.push({
                    id: idMatch[1],
                    version: 1,
                    intent: intentMatch?.[1] ?? '',
                    status: statusMatch?.[1] ?? 'draft',
                    steps,
                    file: 'optimize/src/knownJourneys.ts',
                });
            }
        }
    }

    // Scan journeys.ts for dynamically registered journeys
    const journeysFile = resolve(ROOT, 'optimize/src/journeys.ts');
    if (statSync(journeysFile, { throwIfNoEntry: false })?.isFile()) {
        const source = readFileSync(journeysFile, 'utf8');
        // Look for registerJourney calls
        const registerMatches = source.matchAll(/registerJourney\((\w+)\)/g);
        for (const match of registerMatches) {
            const journeyVar = match[1];
            const varMatch = source.match(new RegExp(`const\\s+${journeyVar}\\s*:\\s*JourneySpec\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`));
            if (varMatch) {
                const journeySource = varMatch[1];
                const idMatch = journeySource.match(/id:\s*['"]([\w-]+)['"]/);
                const intentMatch = journeySource.match(/intent:\s*['"]([^'"]+)['"]/);
                const statusMatch = journeySource.match(/status:\s*['"](\w+)['"]/);
                const stepsMatch = journeySource.match(/steps:\s*\[([\s\S]*?)\]/);
                if (idMatch) {
                    const steps = (stepsMatch?.[1]?.match(/"kind"/g) ?? []).length;
                    journeys.push({
                        id: idMatch[1],
                        version: 1,
                        intent: intentMatch?.[1] ?? '',
                        status: statusMatch?.[1] ?? 'draft',
                        steps,
                        file: 'optimize/src/journeys.ts',
                    });
                }
            }
        }
    }

    return journeys;
}

export function scanStrategies(): ScannedStrategy[] {
    const strategies: ScannedStrategy[] = [];
    const configs = loadStrategyConfigs();
    
    for (const config of configs) {
        strategies.push({
            id: config.id,
            seam: config.seamRole,
            component: config.componentName,
            file: config.componentPath ? `ui/src/${config.componentPath.replace('../', '')}.tsx` : 'unknown',
        });
    }
    
    return strategies;
}

export function scanComponents(): ScannedComponent[] {
    const components: ScannedComponent[] = [];
    const componentFiles = walkDir(resolve(ROOT, 'ui/src'), f => f.endsWith('.tsx') && !f.includes('.test.') && !f.includes('.spec.'));

    for (const file of componentFiles) {
        const source = readFileSync(file, 'utf8');
        const exports = extractExports(source);
        const componentExports = exports.filter(e =>
            e[0] === e[0].toUpperCase() &&
            !e.endsWith('Strategy') &&
            !e.endsWith('Provider') &&
            !e.endsWith('Context') &&
            !e.endsWith('Hook') &&
            !e.endsWith('Util')
        );
        if (componentExports.length > 0) {
            components.push({
                name: componentExports[0],
                file: file.replace(ROOT + '/', ''),
                exports: componentExports,
            });
        }
    }
    return components;
}

export function scanTaxonomy(): ScannedTaxonomy[] {
    const taxonomy: ScannedTaxonomy[] = [];
    const taxonomyDir = resolve(ROOT, 'data/loop/taxonomy');
    if (!statSync(taxonomyDir, { throwIfNoEntry: false })?.isDirectory()) return taxonomy;

    const taxonomyFiles = walkDir(taxonomyDir, f => f.endsWith('.json'));

    for (const file of taxonomyFiles) {
        try {
            const content = JSON.parse(readFileSync(file, 'utf8'));
            if (content.terms) {
                taxonomy.push({
                    domain: content.domain || file.split('/').pop()?.replace('.json', '') || 'unknown',
                    terms: content.terms,
                    file: file.replace(ROOT + '/', ''),
                });
            }
        } catch {
            // Ignore invalid JSON
        }
    }
    return taxonomy;
}

export function scanGoldenCases(): ScannedGoldenCase[] {
    const cases: ScannedGoldenCase[] = [];
    const goldenDir = resolve(ROOT, 'data/loop/golden-cases');
    if (!statSync(goldenDir, { throwIfNoEntry: false })?.isDirectory()) return cases;

    const goldenFiles = walkDir(goldenDir, f => f.endsWith('.json'));

    for (const file of goldenFiles) {
        try {
            const content = JSON.parse(readFileSync(file, 'utf8'));
            if (content.id && content.domain) {
                cases.push({
                    id: content.id,
                    domain: content.domain,
                    file: file.replace(ROOT + '/', ''),
                });
            }
        } catch {
            // Ignore invalid JSON
        }
    }
    return cases;
}

export function scanLoopRuns(): ScannedLoopRun[] {
    const runs: ScannedLoopRun[] = [];
    const runsDir = resolve(ROOT, 'data/loop/runs');
    if (!statSync(runsDir, { throwIfNoEntry: false })?.isDirectory()) return runs;

    for (const entry of readdirSync(runsDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith('run-')) continue;
        const runDir = join(runsDir, entry.name);
        const bundleFile = join(runDir, 'bundle.json');
        if (statSync(bundleFile, { throwIfNoEntry: false })?.isFile()) {
            try {
                const bundle = JSON.parse(readFileSync(bundleFile, 'utf8'));
                runs.push({
                    runId: bundle.runId,
                    journeyId: bundle.journeyId,
                    status: bundle.status,
                    durationMs: bundle.durationMs,
                    file: `data/loop/runs/${entry.name}/bundle.json`,
                });
            } catch {
                // Ignore invalid JSON
            }
        }
    }
    return runs;
}

export function scanAll(): ScanResult {
    // Check cache validity based on ui/src directory mtime
    try {
        const uiSrcDir = resolve(ROOT, 'ui/src');
        const dirStat = statSync(uiSrcDir);
        if (_cachedScanResult && dirStat.mtimeMs <= _cachedScanMtime) {
            return _cachedScanResult;
        }
    } catch {
        // If we can't stat the directory, don't use cache
    }

    const result = {
        version: 1,
        scannedAt: new Date().toISOString(),
        surfaces: scanSurfaces(),
        navigation: scanNavigation(),
        seams: scanSeams(),
        journeys: scanJourneys(),
        strategies: scanStrategies(),
        components: scanComponents(),
        taxonomy: scanTaxonomy(),
        goldenCases: scanGoldenCases(),
        loopRuns: scanLoopRuns(),
    };
    
    _cachedScanResult = result;
    try {
        _cachedScanMtime = statSync(resolve(ROOT, 'ui/src')).mtimeMs;
    } catch {
        _cachedScanMtime = Date.now();
    }
    return result;
}