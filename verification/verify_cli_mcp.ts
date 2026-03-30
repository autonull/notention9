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
    });
    agentProcess.stderr.on('data', (data) => {
        // console.error(`[Agent Err]: ${data}`);
    });

    // Wait for server to start
    await sleep(5000);

    let client: CliClient | null = null;
    let noteId: string | null = null;

    try {
        client = new CliClient('http://localhost:3000/mcp/sse');
        console.log("Connecting to MCP...");
        await client.connect();
        console.log("Connected.");

        // 1. Create Note
        console.log("1. Creating Note...");
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

        // 2. Search Note
        console.log("2. Searching Note...");
        const searchResult = await client.callTool('search_notes', {
            query: 'CRUD Test',
            tags: ['test']
        });
        const searchJson = JSON.parse((searchResult.content[0] as any).text);
        if (!Array.isArray(searchJson) || searchJson.length === 0) {
            throw new Error("Search failed to find the note");
        }
        console.log(`   Found ${searchJson.length} notes.`);

        // 3. Update Note
        console.log("3. Updating Note...");
        await client.callTool('update_note', {
            id: noteId,
            content: 'Updated content'
        });

        // Verify Update
        const readResult = await client.callTool('read_notes', { limit: 100 });
        const allNotes = JSON.parse((readResult.content[0] as any).text);
        const updatedNote = allNotes.find((n: any) => n.id === noteId);
        if (updatedNote.content !== 'Updated content') {
            throw new Error("Update failed content verification");
        }
        console.log("   Update Verified.");

        // 4. Delete Note
        console.log("4. Deleting Note...");
        await client.callTool('delete_note', { id: noteId });

        // Verify Deletion
        const searchDeleted = await client.callTool('search_notes', { query: 'CRUD Test' });
        const deletedJson = JSON.parse((searchDeleted.content[0] as any).text);
        if (deletedJson.length > 0) {
            // Check strict ID match just in case
             if (deletedJson.find((n: any) => n.id === noteId)) {
                 throw new Error("Note still exists after deletion");
             }
        }
        console.log("   Deletion Verified.");

        console.log("All CRUD operations verified successfully!");

        // 5. Test Simulation Capabilities
        console.log("\n5. Testing Simulation Tools...");

        console.log("   Listing Scenarios...");
        const listResult = await client.callTool('list_scenarios', {});
        console.log("   List Scenarios Result:", JSON.stringify(listResult, null, 2));
        const scenarios = JSON.parse((listResult.content[0] as any).text);
        if (!Array.isArray(scenarios) || scenarios.length === 0) {
            throw new Error("No scenarios found");
        }
        const scenarioId = scenarios[0].id;
        console.log(`   Found Scenario: ${scenarioId}`);

        console.log(`   Running Scenario: ${scenarioId}...`);
        // Note: This might fail if the agent skills aren't fully configured/mocked in the server environment
        // effectively. But we want to test that the TOOL executes and returns a result structure.
        const runResult = await client.callTool('run_scenario', { id: scenarioId });
        const runJson = JSON.parse((runResult.content[0] as any).text);

        console.log(`   Run Success: ${runJson.success}`);
        if (!runJson.scenarioId) {
             throw new Error("Invalid scenario run result");
        }
        console.log("   Simulation Tool Verified.");

    } catch (e) {
        console.error("Verification Failed:", e);
        process.exit(1);
    } finally {
        if (client) await client.close();
        if (agentProcess.pid) process.kill(-agentProcess.pid);
        else agentProcess.kill();
        process.exit(0);
    }
}

main();
