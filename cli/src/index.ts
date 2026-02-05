import { CliClient } from './client.js';
import * as readline from 'readline';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';

const SYSTEM_PROMPT = `
You are the "Notention Agent", a helpful AI assistant that controls a Notention profile.
Your goal is to help the user manage their knowledge graph (notes) and execute skills.

Capabilities:
- Manage Notes: Create, Read (Search), Update, Delete.
- Execute Skills: Trigger agent skills based on note content.
- Query Ontology: Understand the semantic structure of the knowledge base.

Guidelines:
- When a user asks to "find" or "search" for something, use 'search_notes'.
- When a user wants to list everything, use 'read_notes' (be mindful of limits).
- When a user provides information to store, use 'create_note'.
- If the user wants to change something, find the note first (if ID not known) then 'update_note'.
- Be concise in your responses.
- If you perform an action, summarize the result.

Output Format:
If you need to call a tool, output a JSON object with:
{ "tool": "tool_name", "args": { ... } }

If you want to respond to the user (or after a tool call), output:
{ "response": "Your text here" }

Only output valid JSON. No markdown blocks.
`;

async function main() {
    const cli = new CliClient(MCP_URL);
    try {
        await cli.connect();
        console.log(`Connected to Notention Agent at ${MCP_URL}`);

        const toolsResult = await cli.listTools();
        const tools = toolsResult.tools;
        // console.log("Available tools:", tools.map(t => t.name).join(", "));

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log("Welcome to Notention CLI.");
        console.log("Type /help for commands, or just chat with the agent.");

        const ask = () => {
            rl.question('> ', async (input) => {
                input = input.trim();

                // Slash commands
                if (input.startsWith('/')) {
                    const [cmd, ...args] = input.split(' ');
                    switch (cmd) {
                        case '/exit':
                        case '/quit':
                            console.log("Goodbye.");
                            await cli.close();
                            process.exit(0);
                            break;
                        case '/clear':
                            console.clear();
                            break;
                        case '/tools':
                            console.log("Tools:", tools.map(t => t.name).join(", "));
                            break;
                        case '/help':
                            console.log(`
Commands:
  /help    - Show this help
  /tools   - List available MCP tools
  /clear   - Clear the screen
  /quit    - Exit the CLI
                            `);
                            break;
                        default:
                            console.log("Unknown command. Type /help.");
                    }
                    ask();
                    return;
                }

                if (!input) {
                    ask();
                    return;
                }

                if (!process.env.OPENAI_API_KEY) {
                    console.warn("OPENAI_API_KEY not set. Echo mode:");
                    console.log(input);
                    ask();
                    return;
                }

                try {
                    // Inject tools into prompt
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
                    if (text.startsWith('```json')) {
                        text = text.replace(/^```json/, '').replace(/```$/, '').trim();
                    } else if (text.startsWith('```')) {
                        text = text.replace(/^```/, '').replace(/```$/, '').trim();
                    }

                    try {
                        const action = JSON.parse(text);
                        if (action.tool) {
                            console.log(`[Agent] Calling ${action.tool}...`);
                            try {
                                const result = await cli.callTool(action.tool, action.args);
                                console.log("[Result]", JSON.stringify(result, null, 2));

                                // Optional: Feed result back to LLM for final response?
                                // For now, just dumping result is fine for a CLI.
                            } catch (toolErr: any) {
                                console.error(`[Error] Tool execution failed: ${toolErr.message}`);
                            }
                        } else if (action.response) {
                            console.log("[Agent]", action.response);
                        } else {
                            console.log("[Agent (raw)]", text);
                        }
                    } catch (jsonErr) {
                        // Fallback if LLM didn't output JSON
                        console.log("[Agent]", text);
                    }

                } catch (e: any) {
                    console.error("Error:", e.message);
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
