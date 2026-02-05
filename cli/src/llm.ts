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

export class LlmSession {
    private history: { role: 'user' | 'assistant' | 'system', content: string }[] = [];
    private cli: CliClient;
    private tools: any[];
    private model: any;

    constructor(cli: CliClient, tools: any[]) {
        this.cli = cli;
        this.tools = tools;
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

                // Check for tool call
                const jsonMatch = fullText.match(/```json\s*(\{[\s\S]*?\})\s*```/);

                if (jsonMatch) {
                    let action;
                    try {
                        action = JSON.parse(jsonMatch[1]);
                    } catch (e) {
                         console.error(chalk.red("Failed to parse tool JSON"));
                         this.history.push({ role: 'assistant', content: fullText });
                         keepGoing = false;
                         continue;
                    }

                    if (action.tool) {
                        const spinner = ora(`Executing tool: ${chalk.bold(action.tool)}`).start();
                        try {
                            const toolResult = await this.cli.callTool(action.tool, action.args);
                            spinner.succeed(`Executed ${chalk.bold(action.tool)}`);

                            const resultStr = JSON.stringify(toolResult, null, 2);

                            this.history.push({ role: 'assistant', content: fullText });
                            this.history.push({ role: 'user', content: `Tool Result: ${resultStr}` });

                        } catch (toolErr: unknown) {
                            const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
                            spinner.fail(`Tool execution failed: ${msg}`);

                            this.history.push({ role: 'assistant', content: fullText });
                            this.history.push({ role: 'user', content: `Tool Error: ${msg}` });
                        }
                    } else {
                        // JSON found but no tool field?
                        this.history.push({ role: 'assistant', content: fullText });
                        keepGoing = false;
                    }
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
