import fs from 'fs';
import path from 'path';
import { CoreMessage } from 'ai';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import { log, withSpinner } from './utils.js';
import { LLMProvider, type LLMProviderConfig } from './providers/base.js';

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

export type { LLMProviderConfig };

interface ToolCall {
    tool: string;
    args: any;
}

export class LlmSession {
    private history: CoreMessage[] = [];
    private toolExecutor: (name: string, args: any) => Promise<any>;
    private tools: ToolDefinition[];
    private provider: LLMProvider;
    private ontologyCache: string | null = null;
    private capabilitiesCache: any | null = null;
    private customPrompt: string | null = null;

    constructor(
        tools: ToolDefinition[],
        toolExecutor: (name: string, args: any) => Promise<any>,
        provider: LLMProvider
    ) {
        this.tools = tools;
        this.toolExecutor = toolExecutor;
        this.provider = provider;
    }

    public updateProvider(newProvider: LLMProvider) {
        this.provider = newProvider;
        log.success(`LLM Provider Updated: ${newProvider.getName()}`);
    }

    public getProvider(): LLMProvider {
        return this.provider;
    }

    public getConfig(): Omit<LLMProviderConfig, 'apiKey'> {
        return this.provider.getConfig();
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
        // Provider health check is now handled by the provider itself
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

            let fullText = '';
            for await (const chunk of this.provider.generateStream(messages)) {
                process.stdout.write(chunk);
                fullText += chunk;
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
