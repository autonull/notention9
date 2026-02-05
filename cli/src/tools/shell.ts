import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';
import { LocalTool } from '../llm.js';

const execAsync = promisify(exec);

export const shellTools: LocalTool[] = [
    {
        name: 'run_shell_command',
        description: 'Execute a shell command. Use with caution.',
        inputSchema: {
            type: 'object',
            properties: {
                command: { type: 'string', description: 'Command to execute' }
            },
            required: ['command']
        },
        execute: async (args: any) => {
            if (!args.command) throw new Error("Command is required");

            // Safe Mode Check
            if (process.env.SAFE_MODE === 'true') {
                // If we are in a non-interactive environment (like a script), we block it.
                // But this tool is designed for the interactive CLI.
                // We'll try to prompt using readline if possible, otherwise block.

                // Note: Since the LLM session might be running, capturing stdin here is tricky
                // because readline might already be active in the main loop.
                // However, we can just return a "Permission Denied" message if we want to be strict,
                // or assume the user (who is running the CLI) explicitly authorized it by NOT setting SAFE_MODE to strict blocking.

                // Let's implement a simple blocker for now.
                return "Error: SAFE_MODE is enabled. Shell commands are disabled.";
            }

            try {
                const { stdout, stderr } = await execAsync(args.command);
                let output = "";
                if (stdout) output += `STDOUT:\n${stdout}\n`;
                if (stderr) output += `STDERR:\n${stderr}\n`;
                if (!output) output = "Command executed successfully (no output).";
                return output;
            } catch (e: any) {
                return `Error executing command: ${e.message}\n${e.stderr || ''}`;
            }
        }
    }
];
