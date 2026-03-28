
import { ScenarioManager } from '../../core/src/testing/ScenarioManager';
import { ScenarioRunner } from './tester/ScenarioRunner';

async function verifyScenario() {
    console.log('🧪 Verifying Scenario Runner...');

    try {
        const manager = new ScenarioManager();
        const runner = new ScenarioRunner();

        await runner.initialize();

        const scenarios = manager.getAll();
        console.log(`Found ${scenarios.length} scenarios.`);

        for (const scenario of scenarios) {
            const result = await runner.run(scenario);
            console.log(`Result for ${scenario.name}:`, result.success ? 'PASSED' : 'FAILED');
            if (!result.success) {
                console.error(result.steps);
            }
        }

        await runner.shutdown();
        console.log('✅ Scenario verification complete');
    } catch (e) {
        console.error('❌ Scenario Error:', e);
        process.exit(1);
    }
}

verifyScenario();
