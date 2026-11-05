/**
 * Prioritize subcommand - prioritizes discovered problems by impact
 */

import { BaseSubcommand, SubcommandConfig, SubcommandOptions } from './base.js';
import { loadDiscoveredArtifact } from '../artifactIO.js';
import { 
    deriveProblemsFromDiscovery, 
    prioritizeProblems,
    deriveProblemsFromFriction,
    createCandidateHypothesesFromFriction,
} from '../../loop/prioritize.js';

export class PrioritizeSubcommand extends BaseSubcommand {
    constructor(config: SubcommandConfig, options: SubcommandOptions) {
        super(config, options);
    }

    protected getName(): string {
        return 'Prioritize';
    }

    protected async execute(): Promise<number> {
        this.logStep('PRIORITIZE');
        
        // Handle --source friction mode
        if (this.options.source === 'friction') {
            this.logInfo('Prioritizing problems from friction journal...\n');
            
            const problems = deriveProblemsFromFriction(this.options.since);
            this.logInfo(`Derived ${problems.length} problems from friction journal`);
            
            const prioritized = prioritizeProblems(problems);
            
            this.logInfo('Prioritized Problems (from friction):');
            for (const p of prioritized) {
                console.log(`   ${p.rank}. [${p.impactScore}] ${p.type}: ${p.description}`);
                if (!this.options.dry) console.log(`      Evidence: ${p.evidence.join('; ')}`);
            }
            
            // Also output candidate hypotheses
            const hypotheses = createCandidateHypothesesFromFriction(this.options.since);
            if (hypotheses.length > 0) {
                this.logInfo('\nCandidate Hypotheses:');
                for (const h of hypotheses) {
                    console.log(`   - ${h.id}: ${h.seamRole} seam params [${h.paramHypotheses.join(', ')}]`);
                    console.log(`     Priority: ${h.priority} | Provenance: ${h.provenance.class}/${h.provenance.source}`);
                    console.log(`     ${h.description}`);
                }
            }
            
            if (!this.options.dry) {
                await this.saveArtifact(this.paths.prioritized, { problems: prioritized, hypotheses });
                this.logSuccess(`Prioritized problems and hypotheses written to ${this.paths.prioritized}`);
            }
            
            this.printDryRun({ problems: prioritized, hypotheses });
            return 0;
        }
        
        this.logInfo('Prioritizing discovered problems by impact...\n');

        // Load discovered artifacts
        const discovered = await loadDiscoveredArtifact(this.options.outputDir);
        if (!discovered) {
            this.logError('No discovered.json found. Run discover first.');
            return 1;
        }
        this.logSuccess(`Loaded discovered artifacts`);

        // Derive problems from discovery
        const problems = deriveProblemsFromDiscovery(discovered);
        this.logInfo(`Derived ${problems.length} problems from discovery`);

        // Prioritize
        const prioritized = prioritizeProblems(problems);

        this.logInfo('Prioritized Problems:');
        for (const p of prioritized) {
            console.log(`   ${p.rank}. [${p.impactScore}] ${p.type}: ${p.description}`);
            if (!this.options.dry) console.log(`      Evidence: ${p.evidence.join('; ')}`);
        }

        // Save prioritized problems
        if (!this.options.dry) {
            await this.saveArtifact(this.paths.prioritized, prioritized);
            this.logSuccess(`Prioritized problems written to ${this.paths.prioritized}`);
        }

        this.printDryRun(prioritized);

        return 0;
    }
}

export async function runPrioritize(
    config: SubcommandConfig,
    outputDir: string,
    dry: boolean,
    json: boolean,
    source?: 'discovery' | 'friction',
    since?: string
): Promise<number> {
    const subcommand = new PrioritizeSubcommand(config, { outputDir, dry, json, source, since });
    return subcommand.run();
}