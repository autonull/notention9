#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, writeFile, readFile, readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { ComponentScanner } from '../discovery/componentScanner.js';
import { TsAstScanner } from '../discovery/tsAstScanner.js';
import { TypeSchemaBuilder } from '../discovery/typeSchema.js';
import { OntologyAdapter } from '../discovery/ontologyAdapter.js';
import { GoldenCaseMiner } from '../discovery/goldenCaseMiner.js';
import { discoverSeams } from '../discovery/seams.js';
import { loadLoopConfig, validateLoopConfig } from '../utils/loopConfig.js';
import { loadTaxonomy, validateTaxonomy } from '../utils/taxonomy.js';

interface LoopParsedFlags {
    json: boolean;
    dry: boolean;
    output: string;
    positionals: string[];
}

function parseLoopFlags(args: string[]): LoopParsedFlags {
    const json = args.includes('--json');
    const dry = args.includes('--dry');

    let output = 'loop/runs';
    const outputIndex = args.findIndex(r => r === '--output');
    if (outputIndex !== -1 && outputIndex + 1 < args.length) {
        output = args[outputIndex + 1];
    } else {
        const outputFlag = args.find(r => r.startsWith('--output='));
        if (outputFlag) output = outputFlag.split('=')[1];
    }

    const flagSet = new Set(['--json', '--dry', '--output']);
    const positionals = args.filter((r, i) => {
        if (flagSet.has(r)) return false;
        if (r.startsWith('--output=')) return false;
        if (i === outputIndex + 1 && args[outputIndex] === '--output') return false;
        return true;
    });

    return { json, dry, output, positionals };
}

function printLoopHelp(): void {
    console.log(`
Usage: pnpm loop <command> [args]

Commands:
  discover [--dry] [--output <dir>]     Discover seams, strategies, tasks, golden cases
  prioritize [--dry] [--output <dir>]   Prioritize discovered problems by impact
  synthesize [--dry] [--output <dir>]   Synthesize candidate strategies (T1-T2)
  evaluate [--dry] [--output <dir>]     Evaluate candidates against baseline
  adopt [--dry] [--output <dir>]        Adopt winning candidate with evidence gate
  run [--dry] [--output <dir>]          Run full discover→prioritize→synthesize→evaluate→adopt cycle
  help                                  Show this help

Options:
  --json                   Output as JSON
  --dry                    Dry run (no file writes)
  --output <dir>           Output directory for artifacts (default: loop/runs)
`);
}

async function ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
}

async function runDiscover(config: any, outputDir: string, dry: boolean, json: boolean): Promise<number> {
    console.log('🔍 Discovering components, seams, tasks, and golden cases...\n');

    const sourceDirs = config.discovery.sourceDirs || ['ui/src', 'core/src', 'simulator/src'];
    const excludePatterns = config.discovery.excludePatterns || ['**/*.test.*', '**/*.spec.*', '**/tests/**', '**/fixtures/**', '**/dist/**', '**/node_modules/**'];

    // 1. Scan components
    console.log('  📦 Scanning components...');
    const componentScanner = new ComponentScanner();
    const discovery = componentScanner.scan();
    const components = discovery.components;
    console.log(`     Found ${components.length} components with props`);

    // 2. Discover seams
    console.log('  🔗 Discovering seams...');
    const seams = await discoverSeams(components);
    console.log(`     Found ${seams.length} seams`);

    // 3. Build type schemas
    console.log('  📐 Building type schemas...');
    const typeSchemaResult = TypeSchemaBuilder.fromProject();
    const typeSchemas = typeSchemaResult.types;
    console.log(`     Built ${typeSchemas.size} type schemas`);

    // 4. Ontology adapter
    console.log('  📚 Loading ontology...');
    const ontologyAdapter = new OntologyAdapter();
    const ontology = await ontologyAdapter.load();
    console.log(`     Loaded ontology with ${ontology.properties.length} properties`);

    // 5. Mine golden cases
    console.log('  🏆 Mining golden cases...');
    const goldenCaseMiner = new GoldenCaseMiner('doc/evidence');
    const goldenCases = await goldenCaseMiner.mine({ minConfidence: 0.5, maxCases: 20 });
    console.log(`     Mined ${goldenCases.length} golden cases`);

    // 6. Derive tasks from taxonomy × ontology × friction
    console.log('  📋 Deriving tasks...');
    const taxonomy = await loadTaxonomy('loop/taxonomy.json');
    const tasks = deriveTasks(taxonomy, ontology, seams);
    console.log(`     Derived ${tasks.length} tasks`);

    // Assemble discovered artifact
    const discovered = {
        timestamp: new Date().toISOString(),
        version: config.version,
        components: components.map(c => ({ name: c.name, file: c.file, props: c.props })),
        seams: seams.map(s => ({ id: s.id, name: s.name, components: s.components, propsShape: s.propsShape })),
        typeSchemas: Array.from(typeSchemas.entries()).map(([k, v]) => ({ key: k, schema: v })),
        ontology: { properties: ontology.properties, operators: ontology.operators },
        goldenCases: goldenCases.map(g => ({ name: g.name, input: g.input, expected: g.expected })),
        tasks: tasks.map(t => ({ id: t.id, name: t.name, type: t.type, seam: t.seam, acceptance: t.acceptance })),
    };

    if (!dry) {
        await ensureDir(outputDir);
        await writeFile(join(outputDir, 'discovered.json'), JSON.stringify(discovered, null, 2));
        console.log(`\n✅ Discovered artifacts written to ${outputDir}/discovered.json`);
    } else {
        console.log('\n🔍 Dry run - no files written');
        if (json) console.log(JSON.stringify(discovered, null, 2));
    }

    return 0;
}

function deriveTasks(taxonomy: any, ontology: any, seams: any[]): any[] {
    const tasks: any[] = [];
    const taskId = 1;

    // Task 1: Capture need with ≥3 properties in <20s
    tasks.push({
        id: 'task-1',
        name: 'Capture need with ≥3 properties in <20s',
        type: 'capture',
        seam: 'capture',
        acceptance: { minProperties: 3, maxTimeSeconds: 20 },
    });

    // Task 2: Capture offer → ≥1 match without re-edit
    tasks.push({
        id: 'task-2',
        name: 'Capture offer → ≥1 match without re-edit',
        type: 'match',
        seam: 'match-display',
        acceptance: { minMatches: 1, maxReedits: 0 },
    });

    // Task 3: Paragraph → valid structured note
    tasks.push({
        id: 'task-3',
        name: 'Paragraph → valid structured note',
        type: 'extraction',
        seam: 'extraction',
        acceptance: { schemaValid: true, minFields: 3 },
    });

    // Task 4: Open note → commitment with status+deadline
    tasks.push({
        id: 'task-4',
        name: 'Open note → commitment with status+deadline',
        type: 'commitment',
        seam: 'intent-surface',
        acceptance: { hasStatus: true, hasDeadline: true },
    });

    // Task 5: Find note by intent
    tasks.push({
        id: 'task-5',
        name: 'Find note by intent',
        type: 'search',
        seam: 'intent-surface',
        acceptance: { findsTarget: true },
    });

    // Task 6: Add missing detail after failed match
    tasks.push({
        id: 'task-6',
        name: 'Add missing detail after failed match',
        type: 'recovery',
        seam: 'detail-elicitation',
        acceptance: { recoversFromFailure: true },
    });

    return tasks;
}

async function main(): Promise<number> {
    const rawArgs = process.argv.slice(2);

    if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
        printLoopHelp();
        return 0;
    }

    const { json, dry, output, positionals } = parseLoopFlags(rawArgs);

    if (positionals.length === 0) {
        printLoopHelp();
        return 0;
    }

    const [subcommand, ...rest] = positionals;

    // Load configuration
    const config = await loadLoopConfig('loop/loop.config.json');
    await validateLoopConfig(config);

    try {
        switch (subcommand) {
            case 'discover': {
                return runDiscover(config, output, dry, json);
            }
            case 'prioritize': {
                console.log('🔄 Prioritize command not yet implemented');
                return 1;
            }
            case 'synthesize': {
                console.log('🔄 Synthesize command not yet implemented');
                return 1;
            }
            case 'evaluate': {
                console.log('🔄 Evaluate command not yet implemented');
                return 1;
            }
            case 'adopt': {
                console.log('🔄 Adopt command not yet implemented');
                return 1;
            }
            case 'run': {
                console.log('🔄 Full loop run not yet implemented');
                return 1;
            }
            case 'help': {
                printLoopHelp();
                return 0;
            }
            default:
                throw new Error(`Unknown subcommand: ${subcommand}. Use: discover, prioritize, synthesize, evaluate, adopt, run, help`);
        }
    } catch (e) {
        console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
        return 1;
    }
}

main().catch(e => {
    console.error(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
});