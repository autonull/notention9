import { DiscoveryEngine } from './index.js';
import { GoalParser, type ParsedGoal, type InferredAction } from './goalParser.js';
import { SelectorInference, type InferredSelector } from './selectorInference.js';
import type { JourneySpec, Step, Target } from '../journey.js';
import type { Note, AppSettings } from '@notention/core';
import type { Finding } from '../finding.js';
import { loadBundle } from '../replay.js';
import { getKnownJourney } from '../knownJourneys.js';
import { expect } from '../expectPolyfill.js';
import { resolvePath } from '../pathUtils.js';
import { getProjectRoot } from '../config.js';
import { generateRegressionTest } from './regressionGenerator.js';
import { buildSeed } from './seedBuilder.js';
import { buildSteps, resolveSelector } from './stepBuilder.js';
import { generateJourneyId, generateIntent, inferJourneysTouched } from './intentBuilder.js';

export interface SynthesisOptions {
    projectRoot?: string;
    includeTraceAssertions?: boolean;
    includeAriaAssertions?: boolean;
    maxSteps?: number;
    seedNotes?: Note[];
    seedSettings?: Partial<AppSettings>;
}

export class JourneySynthesizer {
    private discoveryEngine: DiscoveryEngine;
    private goalParser: GoalParser;
    private selectorInference: SelectorInference;

    constructor(discoveryEngine?: DiscoveryEngine) {
        this.discoveryEngine = discoveryEngine || new DiscoveryEngine();
        this.goalParser = new GoalParser(this.discoveryEngine);
        this.selectorInference = new SelectorInference();
    }

    static fromGoal(goal: string, options: SynthesisOptions = {}): JourneySpec {
        const synthesizer = new JourneySynthesizer();
        return synthesizer.synthesize(goal, options);
    }

    synthesize(goal: string, options: SynthesisOptions = {}): JourneySpec {
        const projectRoot = options.projectRoot || getProjectRoot();

        // Discover components, selectors, and state paths
        const discovery = this.discoveryEngine.discoverWithTypes(projectRoot);
        const selectors = this.selectorInference.infer(discovery.discovery);

        // Parse the goal
        const parsedGoal = this.goalParser.parse(goal, projectRoot);

        // Generate journey ID from goal
        const journeyId = generateJourneyId(goal);

        // Build seed
        const seed = buildSeed(parsedGoal, {
            seedNotes: options.seedNotes,
            seedSettings: options.seedSettings,
        });

        // Build steps
        const steps = buildSteps(parsedGoal, selectors, discovery.statePathRegistry, options);

        // Determine status
        const status = steps.length > 0 && parsedGoal.targetState.path ? 'ready' : 'draft';

        // Generate intent description
        const intent = generateIntent(goal, parsedGoal);

        return {
            id: journeyId,
            version: 1,
            intent,
            journeysTouched: inferJourneysTouched(parsedGoal),
            seed,
            steps,
            status,
        };
    }

    async generateRegressionTest(finding: Finding): Promise<JourneySpec> {
        return generateRegressionTest(finding);
    }

    private getJourneySync(journeyId: string): JourneySpec | undefined {
        return getKnownJourney(journeyId);
    }
}

export const journeySynthesizer = new JourneySynthesizer();