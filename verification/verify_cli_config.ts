import { spawn } from 'child_process';

async function main() {
    console.log("Verifying CLI Configuration...");

    // Test 1: Start with custom model args
    console.log("--- Test 1: Start with custom model args ---");
    const child1 = spawn('npx', ['tsx', 'cli/src/index.ts', '--model', 'custom-model-v1'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, OPENAI_API_KEY: 'mock' }
    });

    let out1 = '';
    child1.stdout.on('data', d => out1 += d.toString());

    // Wait for startup
    await new Promise(r => setTimeout(r, 2000));

    child1.stdin.write("/config\n");
    await new Promise(r => setTimeout(r, 1000));

    child1.stdin.write("exit\n");
    child1.stdin.end();

    await new Promise(r => child1.on('close', r));

    if (out1.includes("Model:    custom-model-v1")) {
        console.log("PASS: Custom model arg applied.");
    } else {
        console.error("FAIL: Custom model arg NOT applied.");
        console.log("Output:", out1);
        process.exit(1);
    }

    // Test 2: Runtime config change
    console.log("--- Test 2: Runtime config change ---");
    const child2 = spawn('npx', ['tsx', 'cli/src/index.ts'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, OPENAI_API_KEY: 'mock' }
    });

    let out2 = '';
    child2.stdout.on('data', d => out2 += d.toString());

    await new Promise(r => setTimeout(r, 2000));

    // Change model
    child2.stdin.write("/config model runtime-model-v2\n");
    await new Promise(r => setTimeout(r, 1000));

    // Verify change
    child2.stdin.write("/config\n");
    await new Promise(r => setTimeout(r, 1000));

    child2.stdin.write("exit\n");
    child2.stdin.end();

    await new Promise(r => child2.on('close', r));

    if (out2.includes("LLM Configuration Updated: openai/runtime-model-v2") && out2.includes("Model:    runtime-model-v2")) {
        console.log("PASS: Runtime config change applied.");
    } else {
        console.error("FAIL: Runtime config change NOT applied.");
        console.log("Output:", out2);
        process.exit(1);
    }

    console.log("Verification Successful.");
}

main();
