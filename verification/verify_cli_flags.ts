import { spawn } from 'child_process';
import path from 'path';

async function runCli(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const cliProcess = spawn('npx', ['tsx', 'cli/src/index.ts', ...args], {
            env: { ...process.env, OPENAI_API_KEY: 'mock' }, // Mock key to avoid echo mode warning if possible, though echo mode logs input
            stdio: 'pipe'
        });

        let output = '';
        cliProcess.stdout.on('data', (data) => output += data.toString());
        cliProcess.stderr.on('data', (data) => output += data.toString());

        cliProcess.on('close', (code) => {
            resolve(output);
        });
    });
}

async function main() {
    console.log("Verifying CLI Flag Behavior...");

    // Test 1: Without Flag
    // We can't easily check internal state, but we can check if it tries to connect to Sim Agent.
    // In our code, we log "Connected to Simulation Agent" if successful.
    // Wait, the CLI logs "Connected to Simulation Agent" only in interactive mode (args.length <= 2).
    // Let's rely on the fact that if we pass a command that needs Sim tools, it will fail or succeed.
    // But in Command Mode, the CLI logic tries to execute the tool if found.
    // The "list_scenarios" tool is only in Sim MCP.

    // Actually, checking the logs for "Connected to Simulation Agent" is hard in Command Mode because we suppressed it.
    // But we can check if it says "Simulation Agent unavailable" if we force it to fail? No.

    // Let's modify the plan:
    // If we run `npx tsx cli/src/index.ts list_scenarios` (without --sim), the tool shouldn't be found in `allTools`.
    // The `LlmSession` will receive "list_scenarios". It will try to find it.
    // If it's not in `tools`, the LLM (or our mock echo) won't see it as a valid tool to call?
    // Wait, the current CLI implementation is:
    // `await session.handleInteraction(input);`
    // If we pass "list_scenarios", it's just text input to the LLM.
    // The LLM decides to call a tool.
    // Without an LLM (Echo Mode), it just echoes "list_scenarios".

    // Correct approach to verify:
    // The `cli/src/index.ts` logs "Connected to Simulation Agent..." if interactive.
    // Let's try to run in interactive mode (no args) but pipe in "exit" immediately?

    console.log("--- Test 1: Interactive Mode WITHOUT flag ---");
    const child1 = spawn('npx', ['tsx', 'cli/src/index.ts'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out1 = '';
    child1.stdout.on('data', d => out1 += d.toString());
    child1.stdin.write("exit\n");
    child1.stdin.end();

    await new Promise(r => child1.on('close', r));

    if (out1.includes("Connected to Simulation Agent")) {
        console.error("FAIL: Simulation connected without flag!");
        process.exit(1);
    } else {
        console.log("PASS: Simulation NOT connected without flag.");
    }

    console.log("--- Test 2: Interactive Mode WITH flag ---");
    const child2 = spawn('npx', ['tsx', 'cli/src/index.ts', '--sim'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out2 = '';
    child2.stdout.on('data', d => out2 += d.toString());
    // Give it a moment to connect
    await new Promise(r => setTimeout(r, 2000));
    child2.stdin.write("exit\n");
    child2.stdin.end();

    await new Promise(r => child2.on('close', r));

    if (out2.includes("Connected to Simulation Agent")) {
        console.log("PASS: Simulation connected with flag.");
    } else {
        console.error("FAIL: Simulation FAILED to connect with flag!");
        console.log("Output:", out2);
        process.exit(1);
    }

    console.log("Verification Successful.");
}

main();
