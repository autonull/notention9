import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { CliClient } from './client.js';

export class LlmSession {
    private history: { role: 'user' | 'assistant' | 'system', content: string }[] = [];
    private cli: CliClient;
    private tools: any[];

    constructor(cli: CliClient, tools: any[]) {
        this.cli = cli;
        this.tools = tools;
    }

    private getSystemPrompt(): string {
        return `
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

Available Tools:
${JSON.stringify(this.tools, null, 2)}

Output Format:
If you need to call a tool, output a JSON object with:
{ "tool": "tool_name", "args": { ... } }

If you want to respond to the user (or after a tool call), output:
{ "response": "Your text here" }

Only output valid JSON. No markdown blocks.
`;
    }

    async handleInteraction(input: string) {
        if (!process.env.OPENAI_API_KEY) {
            console.warn("OPENAI_API_KEY not set. Echo mode:");
            console.log(input);
            return;
        }

        this.history.push({ role: 'user', content: input });

        let keepGoing = true;
        let turns = 0;
        const MAX_TURNS = 10;

        while (keepGoing && turns < MAX_TURNS) {
            turns++;
            try {
                const messages: any[] = [
                    { role: 'system', content: this.getSystemPrompt() },
                    ...this.history
                ];

                const response = await generateText({
                    model: openai('gpt-4o'),
                    messages: messages
                });

                let text = response.text.trim();
                // Clean markdown blocks if present
                if (text.startsWith('```')) {
                     text = text.replace(/^```(json)?/, '').replace(/```$/, '').trim();
                }

                // Try to parse JSON
                let action;
                try {
                    action = JSON.parse(text);
                } catch (e) {
                    // If not JSON, treat as plain response or error
                    // Sometimes models might output text that isn't JSON despite instructions.
                    console.log("[Agent (raw)]", text);
                    this.history.push({ role: 'assistant', content: text });
                    keepGoing = false;
                    continue;
                }

                if (action.tool) {
                    console.log(`[Agent] Calling ${action.tool}...`);
                    try {
                        const result = await this.cli.callTool(action.tool, action.args);
                        // We format the result to be compact if it's huge, but for now just stringify
                        const resultStr = JSON.stringify(result, null, 2);
                        console.log("[Result]", resultStr);

                        this.history.push({ role: 'assistant', content: text });
                        this.history.push({ role: 'user', content: `Tool Result: ${resultStr}` });

                    } catch (toolErr: unknown) {
                        const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
                        console.error(`[Error] Tool execution failed: ${msg}`);
                        this.history.push({ role: 'assistant', content: text });
                        this.history.push({ role: 'user', content: `Tool Error: ${msg}` });
                    }
                } else if (action.response) {
                    console.log("[Agent]", action.response);
                    this.history.push({ role: 'assistant', content: text });
                    keepGoing = false;
                } else {
                    // Fallback for unknown JSON
                    console.log("[Agent (unknown JSON)]", text);
                    this.history.push({ role: 'assistant', content: text });
                    keepGoing = false;
                }

            } catch (e: unknown) {
                 console.error("Error in LLM loop:", e instanceof Error ? e.message : String(e));
                 keepGoing = false;
            }
        }
    }
}
