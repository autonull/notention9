/**
 * Discover subcommand - discovers components, seams, tasks, and golden cases
 */

import { ComponentScanner } from '@notention/optimize/discovery';
import { discoverSeams } from '@notention/optimize/discovery';
import { analyzeDuplicates } from '@notention/optimize/discovery';
import { TypeSchemaBuilder } from '@notention/optimize/discovery';
import { OntologyAdapter } from '@notention/optimize/discovery';
import { GoldenCaseMiner } from '@notention/optimize/discovery';
import { loadTaxonomy } from '@notention/optimize/utils/taxonomy';
import { writeJsonArtifact, writeJsonlArtifact, getArtifactPaths } from '../artifactIO.js';

interface LoopConfig {
    discovery: {
        sourceDirs?: string[];
        excludePatterns?: string[];
    };
    version: string;
}

export async function runDiscover(
    config: LoopConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    console.log('🔍 Discovering components, seams, tasks, and golden cases...\n');

    const paths = getArtifactPaths(outputDir);
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

    // 3. Analyze duplicates
    console.log('  🔍 Analyzing duplicates...');
    const duplicateAnalysis = await analyzeDuplicates(components, seams);
    console.log(`     Found ${duplicateAnalysis.duplicateGroups.length} duplicate groups, ${duplicateAnalysis.deadComponents.length} dead components, ${duplicateAnalysis.inlinedCandidates.length} inline candidates`);
    console.log(`     Actionable findings: ${duplicateAnalysis.summary.actionableFindings}`);

    // 4. Build type schemas
    console.log('  📐 Building type schemas...');
    const typeSchemaResult = TypeSchemaBuilder.fromProject();
    const typeSchemas = typeSchemaResult.types;
    console.log(`     Built ${typeSchemas.size} type schemas`);

    // 5. Ontology adapter
    console.log('  📚 Loading ontology...');
    const ontologyAdapter = new OntologyAdapter();
    const ontology = await ontologyAdapter.load();
    console.log(`     Loaded ontology with ${ontology.properties.length} properties`);

    // 6. Mine golden cases
    console.log('  🏆 Mining golden cases...');
    const goldenCaseMiner = new GoldenCaseMiner('doc/evidence');
    // Mine from evidence bundles
    const evidenceCases = await goldenCaseMiner.mine({ minConfidence: 0.5, maxCases: 20 });
    // Mine from test files
    const testCases = goldenCaseMiner.mineFromTests(['core/src/tests', 'ui/src/tests', 'optimize/src/tests']);
    // Load curated cases from static file
    const curatedCases = goldenCaseMiner.loadCuratedCases('loop/golden-cases.json');
    // Combine and deduplicate
    const goldenCases = [...evidenceCases, ...testCases, ...curatedCases].filter((c, i, arr) => 
        arr.findIndex(x => x.input === c.input) === i
    ).slice(0, 50);
    console.log(`     Mined ${goldenCases.length} golden cases (${evidenceCases.length} from evidence, ${testCases.length} from tests, ${curatedCases.length} curated)`);

    // 7. Derive tasks from taxonomy × ontology × friction
    console.log('  📋 Deriving tasks...');
    const taxonomy = await loadTaxonomy('loop/taxonomy.json');
    const tasks = deriveTasks(taxonomy, ontology, seams);
    console.log(`     Derived ${tasks.length} tasks`);

    // Assemble discovered artifact
    const discovered = {
        timestamp: new Date().toISOString(),
        version: config.version,
        components: components.map((c: any) => ({ name: c.name, file: c.file, props: c.props })),
        seams: seams.map((s: any) => ({ id: s.id, name: s.name, role: s.role, components: s.components, propsShape: s.propsShape })),
        typeSchemas: Array.from(typeSchemas.entries()).map(([k, v]) => ({ key: k, schema: v })),
        ontology: { properties: ontology.properties, operators: ontology.operators },
        duplicateAnalysis: {
            duplicateGroups: duplicateAnalysis.duplicateGroups.map((g: any) => ({
                signature: g.signature,
                primary: g.primary,
                duplicates: g.duplicates,
                reason: g.reason,
            })),
            deadComponents: duplicateAnalysis.deadComponents.map((d: any) => ({
                component: d.component.name,
                reason: d.reason,
                confidence: d.confidence,
            })),
            inlinedCandidates: duplicateAnalysis.inlinedCandidates.map((i: any) => ({
                component: i.component.name,
                reason: i.reason,
                suggestedAction: i.suggestedAction,
            })),
            summary: duplicateAnalysis.summary,
        },
        tasks: tasks.map((t: any) => ({ id: t.id, name: t.name, type: t.type, seam: t.seam, acceptance: t.acceptance })),
    };

    // Write separate artifact files
    if (!dry) {
        await writeJsonArtifact(paths.discovered, discovered, dry);
        
        const tasksJson = {
            timestamp: discovered.timestamp,
            version: config.version,
            tasks: discovered.tasks,
        };
        await writeJsonArtifact(paths.tasks, tasksJson, dry);
        
        const goldenJsonl = goldenCases.map(g => JSON.stringify({
            name: g.name,
            input: g.input,
            expected: g.expected,
            forbidden: g.forbidden,
            expectedOutcome: g.expectedOutcome,
            metadata: g.metadata,
        })).join('\n');
        await writeJsonlArtifact(paths.golden, goldenJsonl.split('\n'), dry);
        
        console.log(`\n✅ Discovered artifacts written to ${outputDir}/`);
        console.log(`   - discovered.json (full artifact)`);
        console.log(`   - tasks.json (task definitions)`);
        console.log(`   - golden.jsonl (golden cases)`);
    } else {
        console.log('\n🔍 Dry run - no files written');
        if (json) console.log(JSON.stringify(discovered, null, 2));
    }

    return 0;
}

function deriveTasks(taxonomy: any, ontology: any, seams: any[]): any[] {
    const tasks: any[] = [];

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