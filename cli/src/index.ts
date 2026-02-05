import { CliClient } from './client.js';
import * as readline from 'readline';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';

async function main() {
    const cli = new CliClient(MCP_URL);
    try {
        await cli.connect();
        console.log(`Connected to Notention Agent at ${MCP_URL}`);

        const toolsResult = await cli.listTools();
        const tools = toolsResult.tools;
        console.log("Available tools:", tools.map(t => t.name).join(", "));

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log("Enter a command (or 'exit'):");

        rl.on('line', async (line) => {
            const input = line.trim();
            if (input === 'exit') {
                rl.close();
                return;
            }

            if (!input) return;

            if (!process.env.OPENAI_API_KEY) {
                console.warn("OPENAI_API_KEY not found. LLM features disabled.");
                // Minimal loopback or manual command parsing could go here
                console.log("You said:", input);
                return;
            }

            try {
                 const prompt = `
You are an AI assistant controlling a Notention profile.
Available tools:
${JSON.stringify(tools, null, 2)}

User Input: "${input}"

If the user input requires an action, output a JSON object with:
{ "tool": "tool_name", "args": { ... } }
If no action or just chat, output:
{ "response": "text response" }
Only output the valid JSON. Do not include markdown formatting.
`;
                const response = await generateText({
                    model: openai('gpt-4o'),
                    prompt: prompt
                });

                let text = response.text.trim();
                // Strip markdown code blocks if present
                if (text.startsWith('```json')) {
                    text = text.replace(/^```json/, '').replace(/```$/, '').trim();
                } else if (text.startsWith('```')) {
                    text = text.replace(/^```/, '').replace(/```$/, '').trim();
                }

                try {
                    const action = JSON.parse(text);
                    if (action.tool) {
                        console.log(`Calling tool ${action.tool} with args:`, action.args);
                        const result = await cli.callTool(action.tool, action.args);
                        console.log("Result:", JSON.stringify(result, null, 2));
                    } else if (action.response) {
                        console.log("Agent:", action.response);
                    } else {
                        console.log("Agent (raw):", text);
                    }
                } catch (jsonErr) {
                    console.error("Failed to parse JSON response from Agent:", text);
                }

            } catch (e: any) {
                console.error("LLM Error:", e.message);
            }
        });

        rl.on('close', async () => {
             await cli.close();
             process.exit(0);
        });

    } catch (e) {
        console.error("Failed to connect:", e);
        process.exit(1);
    }
}

// Check if running directly
// In Node with tsx, this pattern works for ESM
// @ts-ignore
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
