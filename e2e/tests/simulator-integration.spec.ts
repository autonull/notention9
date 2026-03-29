import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';

async function runSimulator(): Promise<string> {
    return new Promise((resolve, reject) => {
        const simulator = spawn('npm', ['start', '-w', 'simulator'], {
            cwd: path.resolve(__dirname, '../../'),
            env: { ...process.env, FORCE_COLOR: '0' } // Disable chalk colors for easier string matching
        });

        let output = '';
        let error = '';

        simulator.stdout.on('data', (data) => {
            output += data.toString();
        });

        simulator.stderr.on('data', (data) => {
            error += data.toString();
        });

        simulator.on('close', (code) => {
            if (code !== 0) {
                // If simulator failed to run, we reject
                // But if it ran and scenario failed (non-zero exit), we might want to inspect output
                // The current simulator exits 0 on success/finally.
            }
            resolve(output + error);
        });

        // Timeout safety
        setTimeout(() => {
            simulator.kill();
            reject(new Error(`Simulator timeout. Output so far: ${output}`));
        }, 30000); // 30s timeout for Gig Economy (15s duration + startup)
    });
}

test.describe('Simulator Integration', () => {
    test('should run Gig Economy scenario and perform semantic matching', async () => {
        // Run the simulator (this will take ~15-20 seconds)
        test.setTimeout(40000); // Override default timeout for this long-running test

        const output = await runSimulator();

        // 1. Verify Relay Startup
        expect(output).toContain('Relay listening on ws://localhost:4444');

        // 2. Verify Ontology Loading
        expect(output).toContain('Ontology Loaded');

        // 3. Verify Agent Spawning
        expect(output).toContain('Spawned 8 agents');

        // 4. Verify Events Occurring
        expect(output).toContain('Event: Client -> publish_job');
        expect(output).toContain('Event: Freelancer -> publish_offer');

        // 5. Verify Semantic Matching (Crucial Step)
        // We look for the log format: "[Role]: Matched event from ... (Score: 1.00)"
        // Since color is disabled, we expect plain text.
        // The exact string depends on Agent.log implementation: `[Name]: Msg`
        // e.g., "[Client 1]: Matched event from"

        // Check for at least one match
        expect(output).toMatch(/\[Client \d+\]: Matched event from/);
        expect(output).toMatch(/Score: 1\.00/);

        // 6. Verify Completion
        expect(output).toContain('Scenario Completed');
    });
});
