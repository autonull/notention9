import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { ROOT } from './paths.js';


// Cache for generated strategies and scanned strategies
let _cachedGeneratedStrategies: StrategyConfig[] = [];
let _cachedGeneratedStrategiesMtime: number = 0;
let _cachedScannedStrategies: ScannedStrategy[] = [];
let _cachedScannedStrategiesMtime: number = 0;

interface ScannedSurface {
    id: string;
    component: string;
    route?: string;
    configKey?: string;
    file: string;
    exports: string[];
}

interface ScannedNavigation {
    view: string;
    hash: string;
    component?: string;
    file: string;
}

interface ScannedSeam {
    role: string;
    strategies: string[];
    file: string;
}

interface ScannedJourney {
    id: string;
    version: number;
    intent: string;
    status: string;
    steps: number;
    file: string;
}

interface ScannedStrategy {
    id: string;
    seam: string;
    component: string;
    file: string;
}

interface StrategyConfig {
    id: string;
    seamId: string;
    seamName: string;
    seamRole: string;
    version: string;
    componentPath: string;
    componentName: string;
    paramSpec: Record<string, unknown>;
    defaultProps: Record<string, unknown>;
}

function loadGeneratedStrategies(): StrategyConfig[] {
    const defsPath = resolve(ROOT, 'core/src/schemas/generated/seam-definitions.ts');
    
    try {
        const stat = statSync(defsPath);
        if (_cachedGeneratedStrategies.length > 0 && stat.mtimeMs <= _cachedGeneratedStrategiesMtime) {
            return _cachedGeneratedStrategies;
        }
    } catch {
        // If we can't stat, don't use cache
    }

    const source = readFileSync(defsPath, 'utf8');

    const strategiesMatch = source.match(/export const STRATEGY_CONFIGS = (\[[\s\S]*?\]);/);
    if (!strategiesMatch) {
        throw new Error('Failed to parse STRATEGY_CONFIGS from generated definitions');
    }

    _cachedGeneratedStrategies = JSON.parse(strategiesMatch[1]);
    _cachedGeneratedStrategiesMtime = statSync(defsPath).mtimeMs;
    return _cachedGeneratedStrategies;
}

function walkDir(dir: string, filter: (file: string) => boolean): string[] {
    const results: string[] = [];
    if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return results;
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
    for (const match of source.matchAll(/export\s+(?:const|function|class|interface|type)\s+(\w+)/g)) {
        exports.push(match[1]);
    }
    for (const match of source.matchAll(/export\s+\{([^}]+)\}/g)) {
        const names = match[1].split(',').map(s => s.trim().split(/\s+/)[0]);
        exports.push(...names);
    }
    return exports;
}

function scanStrategies(): ScannedStrategy[] {
    // Check cache validity based on strategy directories mtime
    const strategyDirs = [
        resolve(ROOT, 'ui/src/strategies'),
        resolve(ROOT, 'ui/src/components/editor'),
        resolve(ROOT, 'ui/src/components/dashboard'),
        resolve(ROOT, 'ui/src/components/assistant'),
    ];

    let cacheValid = _cachedScannedStrategies.length > 0;
    for (const dir of strategyDirs) {
        try {
            const stat = statSync(dir);
            if (stat.mtimeMs > _cachedScannedStrategiesMtime) {
                cacheValid = false;
                break;
            }
        } catch {
            cacheValid = false;
            break;
        }
    }

    if (cacheValid) {
        return _cachedScannedStrategies;
    }

    const strategies: ScannedStrategy[] = [];
    const knownStrategyNames = new Set([
        'QuickCapture', 'PropertyForm', 'DescribeItComposer', 'TemplateSelector',
        'TagInput', 'InlineDetailStrategy', 'LocalMatchesPanel'
    ]);

    for (const dir of strategyDirs) {
        if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) continue;
        const files = walkDir(dir, f => f.endsWith('.tsx'));
        for (const file of files) {
            const source = readFileSync(file, 'utf8');
            const exports = extractExports(source);
            const strategyExports = exports.filter(e => knownStrategyNames.has(e) || e.endsWith('Strategy'));
            if (strategyExports.length > 0) {
                const relativePath = file.replace(ROOT + '/', '');
                for (const exportName of strategyExports) {
                    strategies.push({
                        id: exportName.replace(/Strategy$/, '').toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''),
                        seam: '',
                        component: exportName,
                        file: relativePath,
                    });
                }
            }
        }
    }
    
    _cachedScannedStrategies = strategies;
    try {
        _cachedScannedStrategiesMtime = Math.max(
            ...strategyDirs.map(dir => statSync(dir).mtimeMs)
        );
    } catch {
        _cachedScannedStrategiesMtime = Date.now();
    }
    return strategies;
}

export function emitComponentMap(): string {
    const generatedStrategies = loadGeneratedStrategies();
    const scannedStrategies = scanStrategies();

    const map: Record<string, { path: string; name: string }> = {};

    for (const gen of generatedStrategies) {
        const scanned = scannedStrategies.find(s => s.component === gen.componentName);
        if (scanned) {
            map[gen.id] = {
                path: scanned.file.replace(/\.tsx?$/, '').replace(/^\.\//, '../'),
                name: gen.componentName,
            };
        } else {
            map[gen.id] = {
                path: gen.componentPath.replace(/^\.\//, '../'),
                name: gen.componentName,
            };
        }
    }

    const parts: string[] = [
        '// GENERATED by optimize/src/uisg/componentMap.ts',
        '// DO NOT EDIT MANUALLY',
        '',
        '/**',
        ' * Component path/name mapping for strategies',
        ' * Used by scripts/generate-definitions.ts and ui/src/strategies/strategyConfigs.ts',
        ' * This file has NO dependencies on generated definitions.',
        ' */',
        '',
        'export const componentMap: Record<string, { path: string; name: string }> = {',
    ];

    for (const [id, info] of Object.entries(map).sort(([a], [b]) => a.localeCompare(b))) {
        parts.push(`    '${id}': { path: '${info.path}', name: '${info.name}' },`);
    }

    parts.push('};');
    parts.push('');

    return parts.join('\n');
}

export function writeComponentMap(): void {
    const content = emitComponentMap();
    const outPath = resolve(ROOT, 'ui/src/strategies/componentMap.ts');
    writeFileSync(outPath, content);
    console.log(`Wrote ${outPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    writeComponentMap();
}