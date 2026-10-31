/**
 * Discover subcommand - discovers components, seams, tasks, and golden cases
 */

import { BaseSubcommand, SubcommandConfig, SubcommandOptions } from './base.js';
import { ComponentScanner } from '../../discovery/scanner/componentScanner.js';
import { discoverSeams } from '../../discovery/analyzer/seamAnalyzer.js';
import { analyzeDuplicates } from '../../discovery/analyzer/duplicateAnalyzer.js';
import { TypeSchemaBuilder } from '../../discovery/scanner/typeSchema.js';
import { OntologyAdapter } from '../../discovery/analyzer/ontologyAdapter.js';
import { GoldenCaseMiner } from '../../discovery/testgen/goldenCaseMiner.js';
import { loadTaxonomy } from '../../utils/taxonomy.js';
import { deriveTasks } from './discoverTasks.js';
import { mapComponents, mapSeams, mapDuplicateAnalysis, mapGoldenCase } from './discoverMappers.js';

export class DiscoverSubcommand extends BaseSubcommand {
    constructor(config: SubcommandConfig, options: SubcommandOptions) {
        super(config, options);
    }

    protected getName(): string {
        return 'Discover';
    }

    protected async execute(): Promise<number> {
        this.logStep('DISCOVER');
        this.logInfo('Discovering components, seams, tasks, and golden cases...\n');

        const sourceDirs = this.config.discovery?.sourceDirs || ['ui/src', 'core/src', 'simulator/src'];
        const excludePatterns = this.config.discovery?.excludePatterns || ['**/*.test.*', '**/*.spec.*', '**/tests/**', '**/fixtures/**', '**/dist/**', '**/node_modules/**'];

        // 1. Scan components
        this.logInfo('📦 Scanning components...');
        const componentScanner = new ComponentScanner();
        const discovery = componentScanner.scan();
        const components = discovery.components;
        this.logSuccess(`Found ${components.length} components with props`);

        // 2. Discover seams
        this.logInfo('🔗 Discovering seams...');
        const seams = await discoverSeams(components);
        this.logSuccess(`Found ${seams.length} seams`);

        // 3. Analyze duplicates
        this.logInfo('🔍 Analyzing duplicates...');
        const duplicateAnalysis = await analyzeDuplicates(components, seams);
        this.logSuccess(`Found ${duplicateAnalysis.duplicateGroups.length} duplicate groups, ${duplicateAnalysis.deadComponents.length} dead components, ${duplicateAnalysis.inlinedCandidates.length} inline candidates`);
        this.logSuccess(`Actionable findings: ${duplicateAnalysis.summary.actionableFindings}`);

        // 4. Build type schemas
        this.logInfo('📐 Building type schemas...');
        const typeSchemaResult = TypeSchemaBuilder.fromProject();
        const typeSchemas = typeSchemaResult.types;
        this.logSuccess(`Built ${typeSchemas.size} type schemas`);

        // 5. Ontology adapter
        this.logInfo('📚 Loading ontology...');
        const ontologyAdapter = new OntologyAdapter();
        const ontology = await ontologyAdapter.load();
        this.logSuccess(`Loaded ontology with ${ontology.properties.length} properties`);

        // 6. Mine golden cases
        this.logInfo('🏆 Mining golden cases...');
        const goldenCaseMiner = new GoldenCaseMiner('doc/evidence');
        const evidenceCases = await goldenCaseMiner.mine({ minConfidence: 0.5, maxCases: 20 });
        const testCases = goldenCaseMiner.mineFromTests(['core/src/tests', 'ui/src/tests', 'optimize/src/tests']);
        const curatedCases = goldenCaseMiner.loadCuratedCases('loop/golden-cases.json');
        const goldenCases = [...evidenceCases, ...testCases, ...curatedCases]
            .filter((c, i, arr) => arr.findIndex(x => x.input === c.input) === i)
            .slice(0, 50);
        this.logSuccess(`Mined ${goldenCases.length} golden cases (${evidenceCases.length} from evidence, ${testCases.length} from tests, ${curatedCases.length} curated)`);

        // 7. Derive tasks from taxonomy × ontology × friction
        this.logInfo('📋 Deriving tasks...');
        const taxonomy = await loadTaxonomy('loop/taxonomy.json');
        const tasks = deriveTasks(taxonomy, ontology, seams);
        this.logSuccess(`Derived ${tasks.length} tasks`);

        // Assemble discovered artifact
        const discovered = {
            timestamp: new Date().toISOString(),
            version: this.config.version,
            components: mapComponents(components),
            seams: mapSeams(seams),
            typeSchemas: Array.from(typeSchemas.entries()).map(([k, v]) => ({ key: k, schema: v })),
            ontology: { properties: ontology.properties, operators: ontology.operators },
            duplicateAnalysis: mapDuplicateAnalysis(duplicateAnalysis),
            tasks: tasks.map(t => ({ id: t.id, name: t.name, type: t.type, seam: t.seam, acceptance: t.acceptance })),
        };

        // Write separate artifact files
        if (!this.options.dry) {
            await this.saveArtifact(this.paths.discovered, discovered);

            const tasksJson = {
                timestamp: discovered.timestamp,
                version: this.config.version,
                tasks: discovered.tasks,
            };
            await this.saveArtifact(this.paths.tasks, tasksJson);

            const goldenJsonl = goldenCases.map(g => JSON.stringify(mapGoldenCase(g))).join('\n');
            await this.saveJsonlArtifact(this.paths.golden, goldenJsonl.split('\n'));

            this.printArtifacts(['discovered.json', 'tasks.json', 'golden.jsonl']);
        }

        this.printDryRun(discovered);

        return 0;
    }
}

export async function runDiscover(
    config: SubcommandConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    const subcommand = new DiscoverSubcommand(config, { outputDir, dry, json });
    return subcommand.run();
}