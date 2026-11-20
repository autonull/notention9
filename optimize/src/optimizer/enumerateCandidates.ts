import type { OptimizerConfig, OptimizerCandidate } from './types/index.js';
import { getStrategyParamConfigsByRole } from '@notention/core/constants/strategyParams';
import { enumerateCandidatesFromParamSpec } from './candidates/index.js';
import { createCandidateHypothesesFromFriction, type CandidateHypothesis } from '../loop/prioritize.js';
import { getFrictionCounts } from '@notention/core/telemetry/journal';

export async function enumerateAllCandidates(config: OptimizerConfig): Promise<OptimizerCandidate[]> {
    const allCandidates: OptimizerCandidate[] = [];

    // 1. Grid-search candidates from ParamSpec (existing behavior)
    for (const seamRole of config.targetSeams) {
        const strategyConfigs = getStrategyParamConfigsByRole(seamRole as any);
        console.log(`   Found ${strategyConfigs.length} strategies for seam "${seamRole}"`);

        for (const strategy of strategyConfigs) {
            const candidates = enumerateCandidatesFromParamSpec(strategy, config.maxCandidatesPerSeam);
            console.log(`     ${strategy.id}: ${candidates.length} candidates`);
            allCandidates.push(...candidates);
        }
    }

    // 2. Friction-driven candidates (B3.3)
    if (config.useFrictionCandidates !== false) {
        const frictionHypotheses = createCandidateHypothesesFromFriction();
        console.log(`\n   Friction hypotheses: ${frictionHypotheses.length}`);
        
        for (const hypothesis of frictionHypotheses) {
            // Only generate candidates for target seams
            if (!config.targetSeams.includes(hypothesis.seamRole)) continue;
            
            const strategyConfigs = getStrategyParamConfigsByRole(hypothesis.seamRole as any);
            for (const strategy of strategyConfigs) {
                // Filter paramSpec to only include hypothesized params
                const filteredParamSpec: Record<string, any> = {};
                for (const paramKey of hypothesis.paramHypotheses) {
                    if (strategy.paramSpec[paramKey]) {
                        filteredParamSpec[paramKey] = strategy.paramSpec[paramKey];
                    }
                }
                
                if (Object.keys(filteredParamSpec).length === 0) continue;
                
                // Create a temporary strategy config with filtered params
                const filteredStrategy = {
                    ...strategy,
                    paramSpec: filteredParamSpec,
                };
                
                const candidates = enumerateCandidatesFromParamSpec(filteredStrategy, config.maxCandidatesPerSeam);
                
                // Add friction provenance to each candidate
                for (const candidate of candidates) {
                    candidate.provenance = {
                        generator: 'friction',
                        seed: 42,
                        generatedAt: new Date().toISOString(),
                        frictionProvenance: {
                            class: 'observed',
                            source: 'journal',
                            kinds: hypothesis.provenance.kinds,
                            counts: hypothesis.provenance.counts,
                        },
                    };
                }
                
                console.log(`     ${strategy.id} (friction): ${candidates.length} candidates`);
                allCandidates.push(...candidates);
            }
        }
    }

    return allCandidates;
}