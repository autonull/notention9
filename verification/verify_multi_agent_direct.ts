import { MultiAgentRunner } from '../agent/src/tester/MultiAgentRunner.ts';
import { CommunitySimulation } from '../agent/src/scenarios/CommunitySimulation.ts';
import { UserFlowSimulation } from '../agent/src/scenarios/UserFlowSimulation.ts';

async function main() {
    const runner = new MultiAgentRunner();
    const hasKey = !!process.env.OPENAI_API_KEY;

    if (!hasKey) {
        console.warn("⚠️  OPENAI_API_KEY not found. Skipping strict success assertions, checking runner structure only.");
    }

    console.log("----------------------------------------");
    console.log("Running Community Simulation...");
    console.log("----------------------------------------");
    try {
        const res1 = await runner.run(CommunitySimulation);
        console.log("Result:", JSON.stringify(res1, null, 2));

        if (!res1.scenarioId || res1.scenarioId !== CommunitySimulation.id) {
            console.error("❌ Invalid Scenario ID in result");
            process.exit(1);
        }
        if (res1.steps.length !== CommunitySimulation.steps.length) {
            console.error(`❌ Expected ${CommunitySimulation.steps.length} steps, got ${res1.steps.length}`);
            process.exit(1);
        }

        if (hasKey && !res1.success) {
            console.error("Community Simulation Failed (Strict Check)");
            process.exit(1);
        }
    } catch (e) {
        console.error("Community Simulation Error:", e);
        process.exit(1);
    }

    console.log("\n----------------------------------------");
    console.log("Running User Flow Simulation...");
    console.log("----------------------------------------");
    try {
        const res2 = await runner.run(UserFlowSimulation);
        console.log("Result:", JSON.stringify(res2, null, 2));

        if (!res2.scenarioId) {
             console.error("❌ Invalid Result Structure");
             process.exit(1);
        }

        if (hasKey && !res2.success) {
             console.error("User Flow Simulation Failed (Strict Check)");
             process.exit(1);
        }
    } catch (e) {
        console.error("User Flow Simulation Error:", e);
        process.exit(1);
    }

    console.log("\n✅ All simulations passed (Infrastructure Verified).");
    process.exit(0);
}

main();
