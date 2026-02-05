import * as readline from 'readline';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import dotenv from 'dotenv';
import { CliClient } from './client.js';

dotenv.config();

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';
const SYSTEM_PROMPT = `
You are the "Notention Agent", a helpful AI assistant that controls a Notention profile.
Your goal is to help the user manage their knowledge graph (notes), execute skills, and run simulations.

Capabilities:
- Manage Notes: Create, Read (Search), Update, Delete.
- Execute Skills: Trigger agent skills based on note content.
- Query Ontology: Understand the semantic structure of the knowledge base.
- Simulations: List and run test scenarios to verify agent behavior.

Guidelines:
- When a user asks to "find" or "search" for something, use 'search_notes'.
- When a user wants to list everything, use 'read_notes' (be mindful of limits).
- When a user provides information to store, use 'create_note'.
- If the user wants to change something, find the note first (if ID not known) then 'update_note'.
- To run simulations or tests, use 'list_scenarios' and 'run_scenario'.
- Be concise in your responses.
- If you perform an action, summarize the result.

Output Format:
If you need to call a tool, output a JSON object with:
{ "tool": "tool_name", "args": { ... } }

If you want to respond to the user (or after a tool call), output:
{ "response": "Your text here" }

Only output valid JSON. No markdown blocks.
`;

async function handleSlashCommand(input: string, cli: CliClient, tools: any[]): Promise<boolean> {
    const [cmd, ...args] = input.split(' ');
    switch (cmd) {
        case '/exit':
        case '/quit':
            console.log("Goodbye.");
            await cli.close();
            process.exit(0);
            return true;
        case '/clear':
            console.clear();
            return true;
        case '/tools':
            console.log("Tools:", tools.map(t => t.name).join(", "));
            return true;
        case '/scenarios':
            try {
                const result = await cli.callTool('list_scenarios', {});
                const scenarios = JSON.parse((result.content[0] as any).text);
                console.log("Scenarios:");
                scenarios.forEach((s: any) => console.log(` - ${s.id}: ${s.name}`));
            } catch (e: unknown) {
                console.error("Failed to list scenarios:", e instanceof Error ? e.message : String(e));
            }
            return true;
        case '/run':
            if (args.length === 0) {
                console.log("Usage: /run <scenario_id>");
            } else {
                const id = args[0];
                console.log(`Running scenario '${id}'...`);
                try {
                    const result = await cli.callTool('run_scenario', { id });
                    const runResult = JSON.parse((result.content[0] as any).text);
                    console.log(`Success: ${runResult.success}`);
                    runResult.steps.forEach((step: any) => {
                        const icon = step.success ? '✅' : '❌';
                        console.log(` ${icon} ${step.name} ${step.error ? `(${step.error})` : ''}`);
                    });
                } catch (e: unknown) {
                    console.error("Failed to run scenario:", e instanceof Error ? e.message : String(e));
                }
            }
            return true;
        case '/help':
            console.log(`
Commands:
  /help    - Show this help
  /tools   - List available MCP tools
  /scenarios - List available test scenarios
  /run <id>  - Run a specific scenario
  /clear   - Clear the screen
  /quit    - Exit the CLI
            `);
            return true;
        default:
            console.log("Unknown command. Type /help.");
            return true;
    }
}

async function handleLlmInteraction(input: string, cli: CliClient, tools: any[]) {
    if (!process.env.OPENAI_API_KEY) {
        console.warn("OPENAI_API_KEY not set. Echo mode:");
        console.log(input);
        return;
    }

    try {
        const fullPrompt = `
${SYSTEM_PROMPT}

Available Tools:
${JSON.stringify(tools, null, 2)}

User Input: "${input}"
`;

        const response = await generateText({
            model: openai('gpt-4o'),
            prompt: fullPrompt
        });

        let text = response.text.trim();
        // Clean markdown blocks if present
        if (text.startsWith('```')) {
            text = text.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }

        try {
            const action = JSON.parse(text);
            if (action.tool) {
                console.log(`[Agent] Calling ${action.tool}...`);
                try {
                    const result = await cli.callTool(action.tool, action.args);
                    console.log("[Result]", JSON.stringify(result, null, 2));
                } catch (toolErr: unknown) {
                    const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
                    console.error(`[Error] Tool execution failed: ${msg}`);
                }
            } else if (action.response) {
                console.log("[Agent]", action.response);
            } else {
                console.log("[Agent (raw)]", text);
            }
        } catch (jsonErr) {
            console.log("[Agent]", text);
        }

    } catch (e: unknown) {
        console.error("Error:", e instanceof Error ? e.message : String(e));
    }
}

async function main() {
    const cli = new CliClient(MCP_URL);
    try {
        await cli.connect();
        console.log(`Connected to Notention Agent at ${MCP_URL}`);

        const toolsResult = await cli.listTools();
        const tools = toolsResult.tools;

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log("Welcome to Notention CLI.");
        console.log("Type /help for commands, or just chat with the agent.");

        const ask = () => {
            rl.question('> ', async (rawInput) => {
                const input = rawInput.trim();

                if (!input) {
                    ask();
                    return;
                }

                if (input.startsWith('/')) {
                    await handleSlashCommand(input, cli, tools);
                } else {
                    await handleLlmInteraction(input, cli, tools);
                }

                ask();
            });
        };

        ask();

    } catch (e) {
        console.error("Failed to connect:", e);
        process.exit(1);
    }
}

// Check if running directly
// @ts-ignore
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
