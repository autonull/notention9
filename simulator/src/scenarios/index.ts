import { Scenario } from '../types.js';
import { GigEconomyScenario } from './gigEconomy.js';
import { GoldenPathScenario } from './golden-path.js';
import { RegressionScenario } from './regression.js';
import { DOMAIN_SCENARIOS, getScenarioNames, getScenario, getAllScenarios } from './domainScenarios.js';
import { COMPREHENSIVE_SCENARIOS, getComprehensiveScenarioNames, getComprehensiveScenario, getAllComprehensiveScenarios } from './comprehensiveScenarios.js';

export const SCENARIOS: Record<string, Scenario> = {
    'gig-economy': GigEconomyScenario,
    'golden-path': GoldenPathScenario,
    'regression': RegressionScenario,
    ...DOMAIN_SCENARIOS,
    ...COMPREHENSIVE_SCENARIOS,
};

export { generateScenario } from './generator.js';
export { getScenarioNames, getScenario, getAllScenarios, DOMAIN_SCENARIOS } from './domainScenarios.js';
export { getComprehensiveScenarioNames, getComprehensiveScenario, getAllComprehensiveScenarios, COMPREHENSIVE_SCENARIOS } from './comprehensiveScenarios.js';
