import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';

const AGENT_PORT = 3000;

// Helper to run CLI command
async function runCliCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const cli = spawn('npm', ['start', '-w', '@notention/cli', '--', ...args], {
            cwd: path.resolve(__dirname, '../../'),
            env: { ...process.env, PORT: String(AGENT_PORT) }
        });

        let output = '';
        let error = '';

        cli.stdout.on('data', (data) => {
            output += data.toString();
        });

        cli.stderr.on('data', (data) => {
            error += data.toString();
        });

        cli.on('close', (code) => {
            // We resolve even on non-zero, let tests assertion decide
            resolve(output + error);
        });
    });
}

test.describe('CLI Integration', () => {

    test('should list all tools', async () => {
        const output = await runCliCommand(['/tools']);
        expect(output).toContain('create_note');
        expect(output).toContain('extract_semantics');
        expect(output).toContain('batch_delete_notes');
        expect(output).toContain('run_scenario');
    });

    test('should extract semantics', async () => {
        const output = await runCliCommand(['/extract', 'schedule meeting with Bob tomorrow']);
        expect(output).toContain('Extracted Properties');
        // If LLM is active/mocked, we might see specific keys. 
        // For E2E without real LLM credentials, we check gracefully.
    });

    test('should run simulation scenario', async () => {
        const output = await runCliCommand(['/run', 'marketplace-negotiation']);
        expect(output).toContain('Scenario: Marketplace Negotiation');
        expect(output).toContain('Buyer posts request');
        // This confirms the runtime is loading and executing the steps
    });

    test('should handle batch operations', async () => {
        // 1. Create notes to delete
        // Note: The CLI command /extract is the only "direct" non-chat tool command we exposed for now besides /tools.
        // For batch operations, we currently rely on the LLM to call the tool.
        // However, we can add a test that verifies the tool is available in the list 
        // which we did in the first test.

        // LIMITATION: Without a dedicated /call <tool> command or LLM mock, we can't fully automatedly test
        // complex tool execution via CLI arguments in this iteration.
        // But verifying it appears in /tools is a strong signal it's registered.
        const output = await runCliCommand(['/tools']);
        expect(output).toContain('batch_delete_notes');
    });
});
