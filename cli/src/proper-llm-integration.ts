import fs from 'fs';
import path from 'path';
import { CoreMessage } from 'ai';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import { log } from './utils.js';
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
            this.ontologyCache = result?.content?.[0]?.text ?? "No ontology available.";
        } catch (e) {
            log.warn(`Failed to fetch ontology: ${e}`);
            this.ontologyCache = "Ontology unavailable.";
        }
    }

    private async fetchCapabilities() {
        if (this.capabilitiesCache) return;
        try {
            const hasTool = this.tools.some(t => t.name === 'get_capabilities');
            if (hasTool) {
                const result: any = await this.toolExecutor('get_capabilities', {});
                this.capabilitiesCache = result?.content?.[0]?.text
                    ? JSON.parse(result.content[0].text)
                    : null;
            }
        } catch (e) {
            // Ignore capability fetch errors
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

        const capabilitiesSection = [
            `Capabilities:
- Manage Notes: Create, Read (Search), Update, Delete.
- Execute Skills: Trigger agent skills based on note content.
- Query Ontology: Understand the semantic structure of the knowledge base.
- Simulations: List and run test scenarios to verify agent behavior.
- Multi-Agent Simulations: Run complex scenarios with multiple agents to test ontology and community evolution.
- Local Files: Access and ingest files from the local filesystem.
- Semantic Extraction: Use 'extract_semantics' to understand the properties of a note text.`,
            this.capabilitiesCache ? `
System Flags:
- Browser: ${this.capabilitiesCache.browser ? 'ENABLED' : 'DISABLED'}
- Files: ${this.capabilitiesCache.files ? 'ENABLED' : 'DISABLED'}
- API: ${this.capabilitiesCache.api ? 'ENABLED' : 'DISABLED'}` : ''
        ].filter(Boolean).join('');

        return [
            basePrompt,
            capabilitiesSection,
            `Ontology Context:
${this.ontologyCache || "Ontology loading..."}`,
            `Semantic Properties:
Notention uses a semantic property system. Prefer using the 'properties' field.
Syntax: [key:operator:values]
- key: From ontology (e.g., 'type', 'priority', 'status')
- operator: 'is' (equality), '>' (greater), '<' (less), 'contains'
- values: Comma-separated list (e.g., 'task', 'high', 'active')`,
            `Guidelines:
- Use 'search_notes' to find items.
- Use 'read_notes' for broad listing.
- Use 'create_note' with semantic tags.
- Use 'update_note' after finding ID.
- Use 'run_scenario' for tests.
- Be concise. Summarize actions.
- When a user asks for information that requires accessing notes or other data, YOU MUST use the appropriate tool to retrieve that data.
- Do NOT generate responses that pretend to know what notes exist or what their content is without first using a tool to retrieve that information.
- If a user says "list notes", you must call the 'read_notes' tool before responding.
- If a user asks about specific information, use the appropriate tool to retrieve it first.
- Only after receiving tool results should you formulate a response based on those actual results.

Available Tools:
${JSON.stringify(this.tools, null, 2)}`
        ].join('\n\n');
    }

    async handleInteraction(input: string) {
        if (!this.ontologyCache) await this.fetchOntology();
        if (!this.capabilitiesCache) await this.fetchCapabilities();
        this.loadCustomPrompt();

        this.history.push({ role: 'user', content: input });
        await this.executeTurn();
    }

    private async executeTurn() {
        try {
            log.chat('Agent', '');
            let fullText = '';

            for await (const chunk of this.provider.generateStream([
                { role: 'system', content: this.getSystemPrompt() },
                ...this.history
            ])) {
                process.stdout.write(chunk);
                fullText += chunk;
            }

            this.history.push({ role: 'assistant', content: fullText });

            const toolCalls = this.extractToolCalls(fullText);
            if (toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                    await this.executeToolCall(toolCall);
                    await this.executeTurn();
                    return;
                }
            }
        } catch (e: unknown) {
            log.error("Error in LLM interaction", e);
            if (e instanceof Error) {
                console.error(chalk.red(`LLM Error: ${e.message}`));
            }
        }
    }

    private extractToolCalls(text: string): Array<{ tool: string; args: any }> {
        const jsonBlockRegex = /```json\s*({[\s\S]*?})\s*```/g;
        const inlineRegex = /{[^{}]*"tool"[^{}]*"args"[^{}]*}/g;
        const matches = [...text.matchAll(jsonBlockRegex), ...text.matchAll(inlineRegex)];
        const toolCalls = [];

        for (const match of matches) {
            try {
                const jsonStr = match[1] || match[0];
                const parsed = JSON.parse(jsonStr);
                if (parsed.tool && parsed.args) {
                    toolCalls.push(parsed);
                }
            } catch (e) {
                // Skip invalid JSON
            }
        }

        return toolCalls;
    }

    private async executeToolCall(toolCall: { tool: string; args: any }) {
        try {
            console.log(chalk.blue(`\n[EXECUTING TOOL: ${toolCall.tool}]`));
            const result = await this.toolExecutor(toolCall.tool, toolCall.args);
            console.log(chalk.green(`[RESULT FROM ${toolCall.tool}]:`));
            console.log(JSON.stringify(result, null, 2));

            this.history.push({
                role: 'user',
                content: `Tool "${toolCall.tool}" result: ${JSON.stringify(result)}`
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log(chalk.red(`[ERROR FROM ${toolCall.tool}]: ${errorMsg}`));

            this.history.push({
                role: 'user',
                content: `Tool "${toolCall.tool}" failed with error: ${errorMsg}`
            });
        }
    }
}