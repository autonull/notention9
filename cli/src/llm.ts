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

export interface LLMConfig {
    provider: string;
    model: string;
    baseURL?: string;
}

export class LlmSession {
    private history: { role: 'user' | 'assistant' | 'system', content: string }[] = [];
    private toolExecutor: (name: string, args: any) => Promise<any>;
    private tools: ToolDefinition[];
    private model: any;
    private ontologyCache: any | null = null;
    private config: LLMConfig;

    constructor(
        tools: ToolDefinition[],
        toolExecutor: (name: string, args: any) => Promise<any>,
        initialConfig?: Partial<LLMConfig>
    ) {
        this.tools = tools;
        this.toolExecutor = toolExecutor;

        // Default Config
        this.config = {
            provider: process.env.LLM_PROVIDER || 'openai',
            model: process.env.LLM_MODEL || 'gpt-4o',
            baseURL: process.env.LLM_BASE_URL
        };

        // Override with initial config
        if (initialConfig) {
            this.updateConfigInternal(initialConfig);
        } else {
            this.configureModel();
        }
    }

    public updateConfig(newConfig: Partial<LLMConfig>) {
        this.updateConfigInternal(newConfig);
        console.log(chalk.green(`LLM Configuration Updated: ${this.config.provider}/${this.config.model}`));
    }

    public getConfig(): LLMConfig {
        return { ...this.config };
    }

    private updateConfigInternal(newConfig: Partial<LLMConfig>) {
        this.config = { ...this.config, ...newConfig };

        // Special handling for ollama defaults if not specified
        if (this.config.provider === 'ollama' && !this.config.baseURL) {
            this.config.baseURL = 'http://localhost:11434/v1';
        }

        this.configureModel();
    }

    private configureModel() {
        const apiKey = process.env.OPENAI_API_KEY || (this.config.provider === 'ollama' ? 'ollama' : undefined);

        const openai = createOpenAI({
            baseURL: this.config.baseURL,
            apiKey,
        });

        this.model = openai(this.config.model);
    }

    private async fetchOntology() {
        if (this.ontologyCache) return;
        try {
            // "query_ontology" with empty query should return root? Or maybe we need a specific query.
            // Let's assume we can ask for the full tree or just basic types.
            // If the tool requires a query, we ask for "all types".
            const result: any = await this.toolExecutor('query_ontology', { query: 'ROOT' });

            // The result structure depends on how query_ontology is implemented in Agent.
            // Assuming it returns some text or JSON representation.
            // We'll just store it as a string for context.
            if (result && result.content && result.content[0]) {
                 this.ontologyCache = result.content[0].text;
            } else {
                 this.ontologyCache = "No ontology available.";
            }
        } catch (e) {
            console.warn("Failed to fetch ontology for context:", e);
            this.ontologyCache = "Ontology unavailable.";
        }
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
- Multi-Agent Simulations: Run complex scenarios with multiple agents to test ontology and community evolution.
- Local Files: Access and ingest files from the local filesystem.

Ontology Context:
${this.ontologyCache || "Ontology loading..."}

Semantic Properties:
Notention uses a semantic property system. When creating or updating notes, prefer using the 'properties' field over just text.
Syntax: [key:operator:values]
- key: From ontology (e.g., 'type', 'priority', 'status')
- operator: 'is' (equality), '>' (greater), '<' (less), 'contains'
- values: Comma-separated list (e.g., 'task', 'high', 'active')

Examples:
- Task: [type:is:task], [priority:is:high]
- Person: [type:is:person], [email:contains:gmail.com]
- Project: [type:is:project], [status:is:active]

Guidelines:
- When a user asks to "find" or "search" for something, use 'search_notes'.
- When a user wants to list everything, use 'read_notes' (be mindful of limits).
- When a user provides information to store, use 'create_note' and populate 'properties' with relevant semantic tags.
- If the user wants to change something, find the note first (if ID not known) then 'update_note'.
- To run simulations or tests, use 'list_scenarios' and 'run_scenario'.
- To run multi-agent simulations, use 'list_multi_agent_scenarios' and 'run_multi_agent_scenario'.
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
        if (this.config.provider !== 'ollama' && !process.env.OPENAI_API_KEY) {
            console.warn(chalk.yellow("OPENAI_API_KEY not set. Echo mode:"));
            console.log(input);
            return;
        }

        // Lazy load ontology on first interaction if not present
        if (!this.ontologyCache) {
             await this.fetchOntology();
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
                                const toolResult = await this.toolExecutor(action.tool, action.args);
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
