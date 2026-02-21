import { Scenario } from '../scenario.js';
import { GigEconomyScenario } from './gigEconomy.js';

export const SCENARIOS: Record<string, Scenario> = {
    'gig-economy': GigEconomyScenario,
};

export { generateScenario } from './generator.js';
