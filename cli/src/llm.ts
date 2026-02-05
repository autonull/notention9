import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import ora from 'ora';
import { CliClient } from './client.js';

// Configure marked for terminal output
marked.use({
    // @ts-ignore
    renderer: new TerminalRenderer()
});

export interface ToolDefinition {
    name: string;
    description?: string;
    inputSchema: any;
}

export interface LocalTool extends ToolDefinition {
    execute: (args: any) => Promise<any>;
}

export class LlmSession {
    private history: { role: 'user' | 'assistant' | 'system', content: string }[] = [];
    private cli: CliClient;
    private mcpTools: any[];
    private localTools: LocalTool[];
    private model: any;

    constructor(cli: CliClient, mcpTools: any[], localTools: LocalTool[] = []) {
        this.cli = cli;
        this.mcpTools = mcpTools;
        this.localTools = localTools;
        this.configure();
    }

    private configure() {
        const provider = process.env.LLM_PROVIDER || 'openai';
        const baseURL = process.env.LLM_BASE_URL || (provider === 'ollama' ? 'http://localhost:11434/v1' : undefined);
        const apiKey = process.env.OPENAI_API_KEY || (provider === 'ollama' ? 'ollama' : undefined);

        const openai = createOpenAI({
            baseURL,
            apiKey,
        });

        const modelName = process.env.LLM_MODEL || 'gpt-4o';
        this.model = openai(modelName);
    }

    private getSystemPrompt(): string {
        const allTools = [
            ...this.mcpTools,
            ...this.localTools.map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema
            }))
        ];

        return `
You are the "Notention Agent", a helpful AI assistant that controls a Notention profile.
Your goal is to help the user manage their knowledge graph (notes), execute skills, and run simulations.

Capabilities:
- Manage Notes: Create, Read (Search), Update, Delete.
- Execute Skills: Trigger agent skills based on note content.
- Query Ontology: Understand the semantic structure of the knowledge base.
- Simulations: List and run test scenarios to verify agent behavior.
- Local Files: Access and ingest files from the local filesystem.

Guidelines:
- When a user asks to "find" or "search" for something, use 'search_notes'.
- When a user wants to list everything, use 'read_notes' (be mindful of limits).
- When a user provides information to store, use 'create_note'.
- If the user wants to change something, find the note first (if ID not known) then 'update_note'.
- To run simulations or tests, use 'list_scenarios' and 'run_scenario'.
- Be concise in your responses.
- If you perform an action, summarize the result.

Available Tools:
${JSON.stringify(allTools, null, 2)}

Output Format:
- To speak to the user, just output the text (Markdown supported).
- To call a tool, output a JSON block wrapped in triple backticks:
\`\`\`json
{ "tool": "tool_name", "args": { ... } }
\`\`\`
- You can reason before calling a tool.
`;
    }

    async handleInteraction(input: string) {
        if (process.env.LLM_PROVIDER !== 'ollama' && !process.env.OPENAI_API_KEY) {
            console.warn(chalk.yellow("OPENAI_API_KEY not set. Echo mode:"));
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

                process.stdout.write(chalk.blue('Agent: '));

                const result = await streamText({
                    model: this.model,
                    messages: messages,
                });

                let fullText = '';
                for await (const textPart of result.textStream) {
                    process.stdout.write(textPart);
                    fullText += textPart;
                }
                process.stdout.write('\n');

                // Regex to find ALL JSON blocks
                const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
                // Fallback regex (lazy JSON object if backticks missing)
                // Looks for { "tool": ... } structure roughly
                const fallbackRegex = /(\{\s*"tool"\s*:[\s\S]*?\})/g;

                let matches = [...fullText.matchAll(jsonBlockRegex)];
                let usingFallback = false;

                if (matches.length === 0) {
                    matches = [...fullText.matchAll(fallbackRegex)];
                    if (matches.length > 0) usingFallback = true;
                }

                if (matches.length > 0) {
                    this.history.push({ role: 'assistant', content: fullText });

                    for (const match of matches) {
                         const jsonStr = match[1];
                         let action;
                         try {
                             action = JSON.parse(jsonStr);
                         } catch (e) {
                             console.error(chalk.red("Failed to parse tool JSON snippet"));
                             continue;
                         }

                         if (action.tool) {
                            const spinner = ora(`Executing tool: ${chalk.bold(action.tool)}`).start();
                            try {
                                let toolResult;
                                const localTool = this.localTools.find(t => t.name === action.tool);

                                if (localTool) {
                                    toolResult = await localTool.execute(action.args);
                                } else {
                                    toolResult = await this.cli.callTool(action.tool, action.args);
                                }

                                spinner.succeed(`Executed ${chalk.bold(action.tool)}`);
                                const resultStr = JSON.stringify(toolResult, null, 2);
                                this.history.push({ role: 'user', content: `Tool Result (${action.tool}): ${resultStr}` });

                            } catch (toolErr: unknown) {
                                const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
                                spinner.fail(`Tool execution failed: ${msg}`);
                                this.history.push({ role: 'user', content: `Tool Error (${action.tool}): ${msg}` });
                            }
                         }
                    }
                    // Loop continues to let agent react to results
                } else {
                    // No tool call, just conversation
                    this.history.push({ role: 'assistant', content: fullText });
                    keepGoing = false;
                }

            } catch (e: unknown) {
                 console.error(chalk.red("Error in LLM loop:"), e instanceof Error ? e.message : String(e));
                 keepGoing = false;
            }
        }
    }
}
