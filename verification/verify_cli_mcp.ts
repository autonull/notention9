import { spawn } from 'child_process';
import { CliClient } from '../cli/src/client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_DIR = path.resolve(__dirname, '../agent');

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("Starting Agent Server...");
    const agentProcess = spawn('npm', ['start'], {
        cwd: AGENT_DIR,
        stdio: 'pipe',
        shell: true
    });

    agentProcess.stdout.on('data', (data) => {
        if (data.toString().includes('running on')) {
            console.log("Agent Server appears to be running.");
        }
        console.log(`[Agent Out]: ${data}`);
    });
    agentProcess.stderr.on('data', (data) => {
        console.error(`[Agent Err]: ${data}`);
    });

    // Wait for server to start
    await sleep(10000);

    let client: CliClient | null = null;
    let simClient: CliClient | null = null;
    let noteId: string | null = null;

    try {
        // --- TEST 1: CORE API ---
        client = new CliClient('http://localhost:3000/mcp/sse');
        console.log("Connecting to Core MCP...");
        await client.connect();
        console.log("Connected.");

        // 1. Verify Simulation Tools are ABSENT from Core
        const coreTools = await client.listTools();
        const hasSimTool = coreTools.tools.some((t: any) => t.name === 'run_scenario');
        if (hasSimTool) {
            throw new Error("Core MCP should NOT have simulation tools!");
        }
        console.log("   ✅ Core MCP does not contain simulation tools.");

        // 2. Create Note (Verify Core functionality still works)
        console.log("   Creating Note...");
        const createResult = await client.callTool('create_note', {
            title: 'CRUD Test Note',
            content: 'Initial content',
            tags: ['test', 'crud']
        });
        const createText = (createResult.content[0] as any).text;
        const match = createText.match(/ID: ([\w-]+)/);
        if (!match) throw new Error("Failed to parse ID from create result");
        noteId = match[1];
        console.log(`   Created Note ID: ${noteId}`);

        // Cleanup Note
        await client.callTool('delete_note', { id: noteId });
        console.log("   Cleanup successful.");


        // --- TEST 2: SIMULATION API ---
        console.log("\nConnecting to Simulation MCP...");
        simClient = new CliClient('http://localhost:3000/mcp/simulation/sse');
        await simClient.connect();
        console.log("Connected.");

        const simTools = await simClient.listTools();
        const hasSimToolInSim = simTools.tools.some((t: any) => t.name === 'run_scenario');
        if (!hasSimToolInSim) {
            throw new Error("Simulation MCP SHOULD have simulation tools!");
        }
        console.log("   ✅ Simulation MCP contains simulation tools.");

        console.log("   Listing Scenarios...");
        const listResult = await simClient.callTool('list_scenarios', {});
        const scenarios = JSON.parse((listResult.content[0] as any).text);
        if (!Array.isArray(scenarios) || scenarios.length === 0) {
            throw new Error("No scenarios found in simulation API");
        }
        console.log(`   Found ${scenarios.length} scenarios.`);

        console.log("\n✅ API Separation Verified Successfully!");

    } catch (e) {
        console.error("Verification Failed:", e);
        process.exit(1);
    } finally {
        if (client) await client.close();
        if (simClient) await simClient.close();
        try {
            if (agentProcess.pid) process.kill(-agentProcess.pid);
            else agentProcess.kill();
        } catch (e) {
            // Ignore if process already dead
        }
        process.exit(0);
    }
}

main();
