import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const LLM_SERVER_SCRIPT = path.join(__dirname, 'local-llm-server.mjs');
const LLM_PORT = 11434;
const CLI_Package = '@notention/cli';

console.log("\x1b[36mStarting Local CLI Environment...\x1b[0m");

// 1. Start Local LLM Server
console.log(`\x1b[33mStarting Local LLM Server on port ${LLM_PORT}...\x1b[0m`);
const llmServer = spawn('node', [LLM_SERVER_SCRIPT], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(LLM_PORT) }
});

// Helper to cleanup
const cleanup = () => {
    if (!llmServer.killed) {
        console.log("\n\x1b[33mStopping Local LLM Server...\x1b[0m");
        llmServer.kill();
    }
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// 2. Wait for server to be ready (simple delay for now, or check port)
// A more robust way would be to poll the health endpoint
const waitForServer = async () => {
    const maxRetries = 20;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const res = await fetch(`http://localhost:${LLM_PORT}/v1/models`);
            if (res.ok) return true;
        } catch (e) {
            // ignore
        }
        await new Promise(r => setTimeout(r, 1000));
        process.stdout.write('.');
    }
    return false;
};

// 3. Start CLI once server is ready
(async () => {
    console.log("Waiting for LLM server...");
    const ready = await waitForServer();
    if (!ready) {
        console.error("\n\x1b[31mFailed to connect to Local LLM Server.\x1b[0m");
        cleanup();
        return;
    }
    console.log("\n\x1b[32mLocal LLM Server Ready!\x1b[0m");

    console.log("\x1b[36mLaunching CLI...\x1b[0m");

    // Pass strictly the arguments after -- to the CLI
    // In npm run script, arguments are passed via process.argv
    // But we need to forward them to the next npm command

    // Get args passed to this script
    const args = process.argv.slice(2);

    const cli = spawn('npm', ['start', '-w', CLI_Package, '--', ...args], {
        stdio: 'inherit',
        env: {
            ...process.env,
            LLM_PROVIDER: 'local',
            LLM_BASE_URL: `http://localhost:${LLM_PORT}/v1`
        }
    });

    cli.on('close', (code) => {
        console.log(`CLI exited with code ${code}`);
        cleanup();
    });
})();
