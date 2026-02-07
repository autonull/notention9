import fs from 'fs';
import path from 'path';
import { streamText, CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import { log, withSpinner } from './utils.js';

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
    apiKey?: string;
}

interface ToolCall {
    tool: string;
    args: any;
}

export class LlmSession {
    private history: CoreMessage[] = [];
    private toolExecutor: (name: string, args: any) => Promise<any>;
    private tools: ToolDefinition[];
    private model: any;
    private ontologyCache: string | null = null;
    private capabilitiesCache: any | null = null;
    private customPrompt: string | null = null;
    private config: LLMConfig;

    constructor(
        tools: ToolDefinition[],
        toolExecutor: (name: string, args: any) => Promise<any>,
        initialConfig?: Partial<LLMConfig>
    ) {
        this.tools = tools;
        this.toolExecutor = toolExecutor;

        // Initialize Config (Args > Env > Default)
        this.config = {
            provider: initialConfig?.provider || process.env.LLM_PROVIDER || 'openai',
            model: initialConfig?.model || process.env.LLM_MODEL || 'gpt-4o',
            baseURL: initialConfig?.baseURL || process.env.LLM_BASE_URL,
            apiKey: initialConfig?.apiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY
        };

        this.configureModel();
    }

    public updateConfig(newConfig: Partial<LLMConfig>) {
        this.config = { ...this.config, ...newConfig };
        this.configureModel();
        log.success(`LLM Configuration Updated: ${this.config.provider}/${this.config.model}`);
    }

    public getConfig(): LLMConfig {
        return { ...this.config };
    }

    private configureModel() {
        // Special handling for Ollama defaults
        if (this.config.provider === 'ollama' && !this.config.baseURL) {
            this.config.baseURL = 'http://localhost:11434/v1';
        }

        const apiKey = this.config.apiKey || (this.config.provider === 'ollama' ? 'ollama' : undefined);

        const openai = createOpenAI({
            baseURL: this.config.baseURL,
            apiKey,
        });
        this.model = openai(this.config.model);
    }

    private async fetchOntology() {
        if (this.ontologyCache) return;
        try {
            const result: any = await this.toolExecutor('query_ontology', { query: 'ROOT' });
            this.ontologyCache = (result?.content?.[0]?.text) ?? "No ontology available.";
        } catch (e) {
            log.warn(`Failed to fetch ontology: ${e}`);
            this.ontologyCache = "Ontology unavailable.";
        }
    }

    private async fetchCapabilities() {
        if (this.capabilitiesCache) return;
        try {
            // Check if tool exists
            const hasTool = this.tools.some(t => t.name === 'get_capabilities');
            if (hasTool) {
                const result: any = await this.toolExecutor('get_capabilities', {});
                this.capabilitiesCache = result?.content?.[0]?.text
                    ? JSON.parse(result.content[0].text)
                    : null;
            }
        } catch (e) {
            // Ignore capability fetch errors (tool might not exist yet)
        }
    }

    private loadCustomPrompt() {
        if (this.customPrompt) return;
        const potentialPaths = [
            path.join(process.cwd(), 'config', 'system_prompt.md'),
            path.join(process.cwd(), 'system_prompt.md')
        ];

        for (const p of potentialPaths) {
            if (fs.existsSync(p)) {
                try {
                    this.customPrompt = fs.readFileSync(p, 'utf-8');
                    log.info(`Loaded custom system prompt from ${p}`);
                    break;
                } catch (e) {
                    log.error(`Failed to read system prompt file: ${e}`);
                }
            }
        }
    }

    private getSystemPrompt(): string {
        const basePrompt = this.customPrompt || `
You are the "Notention Agent", a helpful AI assistant that controls a Notention profile.
Your goal is to help the user manage their knowledge graph (notes), execute skills, and run simulations.
`;

        let capabilitiesSection = `
Capabilities:
- Manage Notes: Create, Read (Search), Update, Delete.
- Execute Skills: Trigger agent skills based on note content.
- Query Ontology: Understand the semantic structure of the knowledge base.
- Simulations: List and run test scenarios to verify agent behavior.
- Multi-Agent Simulations: Run complex scenarios with multiple agents to test ontology and community evolution.
- Local Files: Access and ingest files from the local filesystem.
- Semantic Extraction: Use 'extract_semantics' to understand the properties of a note text.
`;

        if (this.capabilitiesCache) {
            capabilitiesSection += `
System Flags:
- Browser: ${this.capabilitiesCache.browser ? 'ENABLED' : 'DISABLED'}
- Files: ${this.capabilitiesCache.files ? 'ENABLED' : 'DISABLED'}
- API: ${this.capabilitiesCache.api ? 'ENABLED' : 'DISABLED'}
`;
        }

        return `
${basePrompt}

${capabilitiesSection}

Ontology Context:
${this.ontologyCache || "Ontology loading..."}

Semantic Properties:
Notention uses a semantic property system. Prefer using the 'properties' field.
Syntax: [key:operator:values]
- key: From ontology (e.g., 'type', 'priority', 'status')
- operator: 'is' (equality), '>' (greater), '<' (less), 'contains'
- values: Comma-separated list (e.g., 'task', 'high', 'active')

Guidelines:
- Use 'search_notes' to find items.
- Use 'read_notes' for broad listing.
- Use 'create_note' with semantic tags.
- Use 'update_note' after finding ID.
- Use 'run_scenario' for tests.
- Be concise. Summarize actions.

Available Tools:
${JSON.stringify(this.tools, null, 2)}

Output Format:
- Speak directly to the user (Markdown supported).
- Call tools using JSON blocks:
\`\`\`json
{ "tool": "tool_name", "args": { ... } }
\`\`\`
`;
    }

    async handleInteraction(input: string) {
        // Validation: If no API key and not Ollama, warn and echo (unless local server usage mimics OpenAI without checking key?)
        // Our local server ignores keys, but we pass "sk-dummy".
        // If config.apiKey is set (which it is for local script), we proceed.
        if (!this.config.apiKey && this.config.provider !== 'ollama') {
             // Check if baseURL implies local?
             // Ideally we shouldn't block if user knows what they are doing.
             // But let's keep the warning for standard usage.
             log.warn("API Key not set. Echo mode:");
             console.log(input);
             return;
        }

        if (!this.ontologyCache) await this.fetchOntology();
        if (!this.capabilitiesCache) await this.fetchCapabilities();
        this.loadCustomPrompt();

        this.history.push({ role: 'user', content: input });

        let turns = 0;
        const MAX_TURNS = 10;

        while (turns < MAX_TURNS) {
            turns++;
            const continueLoop = await this.executeTurn();
            if (!continueLoop) break;
        }
    }

    private async executeTurn(): Promise<boolean> {
        try {
            const messages: CoreMessage[] = [
                { role: 'system', content: this.getSystemPrompt() },
                ...this.history
            ];

            log.chat('Agent', '');

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

            this.history.push({ role: 'assistant', content: fullText });

            const toolCalls = this.parseToolCalls(fullText);

            if (toolCalls.length > 0) {
                for (const call of toolCalls) {
                    await this.processToolCall(call);
                }
                return true; // Continue loop after tool execution
            }

            return false; // Stop if no tools called

        } catch (e: unknown) {
            log.error("Error in LLM loop", e);
            return false;
        }
    }

    private parseToolCalls(text: string): ToolCall[] {
        const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
        const fallbackRegex = /(\{\s*"tool"\s*:[\s\S]*?\})/g;

        let matches = [...text.matchAll(jsonBlockRegex)];
        if (matches.length === 0) {
            matches = [...text.matchAll(fallbackRegex)];
        }

        return matches.map(match => {
            try {
                return JSON.parse(match[1]);
            } catch (e) {
                log.error("Failed to parse tool JSON snippet", e);
                return null;
            }
        }).filter((call): call is ToolCall => call !== null && typeof call.tool === 'string');
    }

    private async processToolCall(call: ToolCall) {
        try {
            const toolResult = await withSpinner(
                `Executing tool: ${chalk.bold(call.tool)}`,
                () => this.toolExecutor(call.tool, call.args)
            );
            const resultStr = JSON.stringify(toolResult, null, 2);
            this.history.push({ role: 'user', content: `Tool Result (${call.tool}): ${resultStr}` });
        } catch (toolErr: unknown) {
            const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
            log.error(`Tool execution failed`, toolErr);
            this.history.push({ role: 'user', content: `Tool Error (${call.tool}): ${msg}` });
        }
    }
}
