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
        // console.log(`[Agent]: ${data}`);
    });
    agentProcess.stderr.on('data', (data) => {
        // console.error(`[Agent Err]: ${data}`);
    });

    // Wait for server to start
    await sleep(8000);

    let client: CliClient | null = null;
    let noteId: string | null = null;

    try {
        client = new CliClient('http://localhost:3000/mcp/sse');
        console.log("Connecting to Core MCP...");
        await client.connect();
        console.log("Connected.");

        // --- TEST 1: Get Capabilities ---
        console.log("Testing get_capabilities...");
        const capsResult = await client.callTool('get_capabilities', {});
        const caps = JSON.parse((capsResult.content[0] as any).text);

        console.log("Capabilities:", caps);
        if (typeof caps.browser !== 'boolean' || typeof caps.files !== 'boolean') {
            throw new Error("Invalid capabilities response structure");
        }
        console.log("✅ get_capabilities verified.");


        // --- TEST 2: Promote to Thought ---
        console.log("\nTesting promote_to_thought...");

        // Create a note first
        const createResult = await client.callTool('create_note', {
            title: 'Thought Candidate',
            content: 'This is a note that will become a thought.',
            tags: ['test']
        });
        const createText = (createResult.content[0] as any).text;
        const match = createText.match(/ID: ([\w-]+)/);
        if (!match) throw new Error("Failed to parse ID from create result");
        noteId = match[1];
        console.log(`   Created Note ID: ${noteId}`);

        // Promote it
        const promoteResult = await client.callTool('promote_to_thought', {
            noteId: noteId,
            intent: 'planning',
            sovereignty: 'local'
        });
        console.log(`   Promote Result: ${(promoteResult.content[0] as any).text}`);

        // Verify properties
        const readResult = await client.callTool('read_notes', { limit: 1000 });
        const allNotes = JSON.parse((readResult.content[0] as any).text);
        const myNote = allNotes.find((n: any) => n.id === noteId);

        if (!myNote) throw new Error("Could not find note after promotion");

        const typeProp = myNote.properties.find((p: any) => p.key === 'type' && p.values.includes('thought'));
        const intentProp = myNote.properties.find((p: any) => p.key === 'thought:intent' && p.values.includes('planning'));
        const sovProp = myNote.properties.find((p: any) => p.key === 'thought:sovereignty' && p.values.includes('local'));

        if (!typeProp || !intentProp || !sovProp) {
            console.error("Properties:", myNote.properties);
            throw new Error("Note properties were not updated correctly for Thought promotion");
        }
        console.log("✅ promote_to_thought verified (properties updated).");

        // Cleanup
        await client.callTool('delete_note', { id: noteId });
        console.log("   Cleanup successful.");

    } catch (e) {
        console.error("Verification Failed:", e);
        process.exit(1);
    } finally {
        if (client) await client.close();
        try {
            if (agentProcess.pid) process.kill(-agentProcess.pid);
            else agentProcess.kill();
        } catch (e) {
            // Ignore
        }
        process.exit(0);
    }
}

main();
