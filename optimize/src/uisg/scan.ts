import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

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

export function scanSurfaces(): ScannedSurface[] {
    const surfaces: ScannedSurface[] = [];
    const surfaceFiles = walkDir(resolve(ROOT, 'ui/src'), f => /Surface\.tsx?$/.test(f) || f === 'uiSurfaces.ts');

    for (const file of surfaceFiles) {
        const source = readFileSync(file, 'utf8');
        const exports = extractExports(source);

        // Look for surface-like exports (capitalized, ending in common suffixes)
        const surfaceExports = exports.filter(e =>
            e[0] === e[0].toUpperCase() &&
            (e.endsWith('Surface') || e.endsWith('View') || e.endsWith('Panel') || e.endsWith('Dialog') || e.endsWith('Modal'))
        );

        for (const name of surfaceExports) {
            surfaces.push({
                id: `surface.${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                component: name,
                file: file.replace(ROOT + '/', ''),
                exports: [name],
            });
        }
    }
    return surfaces;
}

export function scanNavigation(): ScannedNavigation[] {
    const navigation: ScannedNavigation[] = [];

    // Scan router files
    const routerFiles = walkDir(resolve(ROOT, 'ui/src'), f => f.includes('router') || f.includes('Router') || f === 'routes.ts' || f === 'navigation.ts');

    for (const file of routerFiles) {
        const source = readFileSync(file, 'utf8');
        // Extract route patterns like '#/notes', '#/notes/:noteId', '#/settings/ontology', etc.
        const routeMatches = source.matchAll(/['"#]([#\/][\w\/:.-]+)['"]/g);
        for (const match of routeMatches) {
            const hash = match[1];
            if (hash.startsWith('#/') && hash.length > 2) {
                navigation.push({
                    view: hash.split('/')[1] || 'root',
                    hash,
                    file: file.replace(ROOT + '/', ''),
                });
            }
        }
    }
    return navigation;
}

export function scanSeams(): ScannedSeam[] {
    const seams: ScannedSeam[] = [];

    // Scan core constants/seams.ts for seam roles
    const seamsFile = resolve(ROOT, 'core/src/constants/seams.ts');
    if (statSync(seamsFile, { throwIfNoEntry: false })?.isFile()) {
        const source = readFileSync(seamsFile, 'utf8');
        const seamMatches = source.matchAll(/['"](\w+)['"]/g);
        const roles = new Set<string>();
        for (const match of seamMatches) {
            const role = match[1];
            if (role.length > 1 && role !== 'SEAM_ROLES') {
                roles.add(role);
            }
        }
        for (const role of roles) {
            seams.push({
                role,
                strategies: [],
                file: 'core/src/constants/seams.ts',
            });
        }
    }

    // Scan strategy configs for seam-strategy mappings
    const configFiles = walkDir(resolve(ROOT, 'ui/src'), f => f === 'strategyConfigs.ts' || f.includes('strategyConfigs'));
    for (const file of configFiles) {
        const source = readFileSync(file, 'utf8');
        const seamMatches = source.matchAll(/seam:\s*['"](\w+)['"]/g);
        for (const match of seamMatches) {
            const existing = seams.find(s => s.role === match[1]);
            if (existing) {
                // Could add strategies here with deeper parsing
            } else {
                seams.push({
                    role: match[1],
                    strategies: [],
                    file: file.replace(ROOT + '/', ''),
                });
            }
        }
    }
    return seams;
}

export function scanJourneys(): ScannedJourney[] {
    const journeys: ScannedJourney[] = [];

    // Scan knownJourneys.ts - parse the Record object
    const knownJourneysFile = resolve(ROOT, 'optimize/src/knownJourneys.ts');
    if (statSync(knownJourneysFile, { throwIfNoEntry: false })?.isFile()) {
        const source = readFileSync(knownJourneysFile, 'utf8');

        // Find each journey key in the Record (keys may contain hyphens)
        const keyMatches = source.matchAll(/['"]([\w-]+)['"]:\s*\{/g);
        for (const keyMatch of keyMatches) {
            const key = keyMatch[1];
            const startIdx = keyMatch.index + keyMatch[0].length;

            // Find the matching closing brace for this journey
            let braceCount = 1;
            let endIdx = startIdx;
            while (endIdx < source.length && braceCount > 0) {
                if (source[endIdx] === '{') braceCount++;
                else if (source[endIdx] === '}') braceCount--;
                endIdx++;
            }

            const journeySource = source.substring(startIdx, endIdx - 1);

            // Extract fields from this journey source (ids may contain hyphens, kind may use single or double quotes)
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

    // Also scan journeys.ts for dynamically registered journeys
    const journeysFile = resolve(ROOT, 'optimize/src/journeys.ts');
    if (statSync(journeysFile, { throwIfNoEntry: false })?.isFile()) {
        const source = readFileSync(journeysFile, 'utf8');
        const importMatches = source.matchAll(/from\s+['"]([^'"]+)['"]/g);
        for (const match of importMatches) {
            if (match[1].includes('.journey.ts')) {
                const journeyFile = resolve(ROOT, 'optimize/src', match[1]);
                if (statSync(journeyFile, { throwIfNoEntry: false })?.isFile()) {
                    const jSource = readFileSync(journeyFile, 'utf8');
                    const idMatch = jSource.match(/id:\s*['"](\w+)['"]/);
                    const intentMatch = jSource.match(/intent:\s*['"]([^'"]+)['"]/);
                    const statusMatch = jSource.match(/status:\s*['"](\w+)['"]/);
                    const stepsMatch = jSource.match(/steps:\s*\[([\s\S]*?)\]/);
                    if (idMatch) {
                        journeys.push({
                            id: idMatch[1],
                            version: 1,
                            intent: intentMatch?.[1] ?? '',
                            status: statusMatch?.[1] ?? 'draft',
                            steps: (stepsMatch?.[1]?.match(/"kind"/g) ?? []).length,
                            file: `optimize/src/${match[1]}`,
                        });
                    }
                }
            }
        }
    }

    return journeys;
}

export function scanStrategies(): ScannedStrategy[] {
    const strategies: ScannedStrategy[] = [];
    const strategyFiles = walkDir(resolve(ROOT, 'ui/src/strategies'), f => f.endsWith('Strategy.tsx') || f.endsWith('Strategy.ts'));

    for (const file of strategyFiles) {
        const source = readFileSync(file, 'utf8');
        const exports = extractExports(source);
        for (const name of exports) {
            if (name.endsWith('Strategy')) {
                const seamMatch = source.match(/seam:\s*['"](\w+)['"]/);
                strategies.push({
                    id: name,
                    seam: seamMatch?.[1] ?? 'unknown',
                    component: name,
                    file: file.replace(ROOT + '/', ''),
                });
            }
        }
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
            !e.endsWith('Context')
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
    return {
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
}