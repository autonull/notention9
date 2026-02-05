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
        if (data.toString().includes('running on')) {
            console.log("Agent Server appears to be running.");
        }
    });
    agentProcess.stderr.on('data', (data) => {
        console.error(`[Agent Err]: ${data}`);
    });

    // Wait for server to start
    console.log("Waiting 10s for server to be ready...");
    await sleep(10000);

    try {
        const client = new CliClient('http://localhost:3000/mcp/sse');
        console.log("Connecting to MCP...");
        await client.connect();
        console.log("Connected.");

        console.log("Listing tools...");
        const toolsResult = await client.listTools();
        const tools = toolsResult.tools;
        console.log("Tools:", tools.map(t => t.name));

        if (!tools.find(t => t.name === 'create_note')) {
            throw new Error("create_note tool not found");
        }

        console.log("Creating a test note...");
        const createResult = await client.callTool('create_note', {
            title: 'Verification Note',
            content: 'This note was created by the verification script.',
            tags: ['verification', 'cli']
        });
        console.log("Create Result:", JSON.stringify(createResult));

        console.log("Reading notes...");
        const readResult = await client.callTool('read_notes', {});

        const content = readResult.content[0].text;
        if (!content.includes('Verification Note')) {
             throw new Error("Verification Note not found in read_notes result");
        }

        console.log("Verification Successful!");

        await client.close();

    } catch (e) {
        console.error("Verification Failed:", e);
        // Kill agent
        if (agentProcess.pid) process.kill(-agentProcess.pid); // Attempt group kill
        else agentProcess.kill();
        process.exit(1);
    } finally {
        console.log("Killing Agent...");
        // Kill agent
        // On Linux, npm start spawns a shell which spawns tsx.
        // tree-kill is better but I don't have it.
        // I'll try simply killing the process.
        // In the sandbox, simple kill usually works or leaves orphan.
        agentProcess.kill();
        process.exit(0);
    }
}

main();
