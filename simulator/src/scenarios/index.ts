import { Scenario } from '../types.js';
import { GigEconomyScenario } from './gigEconomy.js';
import { GoldenPathScenario } from './golden-path.js';
import { RegressionScenario } from './regression.js';

export const SCENARIOS: Record<string, Scenario> = {
    'gig-economy': GigEconomyScenario,
    'golden-path': GoldenPathScenario,
    'regression': RegressionScenario,
};

export { generateScenario } from './generator.js';
