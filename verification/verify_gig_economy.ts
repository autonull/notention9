import { MultiAgentRunner } from '../agent/src/tester/MultiAgentRunner.ts';
import { GigEconomySimulation } from '../agent/src/scenarios/GigEconomySimulation.ts';

async function main() {
    console.log("Verifying Gig Economy Simulation...");
    const runner = new MultiAgentRunner();

    // We skip strict assertions if no key, but we want to see it run
    const hasKey = !!process.env.OPENAI_API_KEY;
    if (!hasKey) console.warn("⚠️  OPENAI_API_KEY missing. Strict checks skipped.");

    try {
        const result = await runner.run(GigEconomySimulation);
        console.log("Result:", JSON.stringify(result, null, 2));

        if (!result.scenarioId || result.scenarioId !== GigEconomySimulation.id) {
            console.error("❌ Invalid Scenario ID in result");
            process.exit(1);
        }

        if (result.steps.length !== GigEconomySimulation.steps.length) {
             console.error(`❌ Expected ${GigEconomySimulation.steps.length} steps, got ${result.steps.length}`);
             process.exit(1);
        }

        if (hasKey && !result.success) {
             console.error("❌ Gig Economy Simulation Failed");
             process.exit(1);
        }

        console.log("✅ Gig Economy Simulation Infrastructure Verified.");
    } catch (e) {
        console.error("Simulation Error:", e);
        process.exit(1);
    }
}

main();
