import fs from 'fs';
import path from 'path';
import { CoreMessage } from 'ai';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import ora from 'ora';
import { log, withSpinner, resolveSafePath } from './utils.js';
import { LLMProvider, type LLMProviderConfig } from './providers/base.js';
import { SystemPromptBuilder } from './system-prompt.js';
import { parseToolCalls, type ToolCall } from './tool-parser.js';

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
    #history: CoreMessage[] = [];
    #toolExecutor: (name: string, args: any) => Promise<any>;
    #tools: ToolDefinition[];
    #provider: LLMProvider;
    #ontologyCache: string | null = null;
    #capabilitiesCache: any | null = null;
    #activeContext: { id: string, title: string } | null = null;
    #promptBuilder: SystemPromptBuilder;

    constructor(
        tools: ToolDefinition[],
        toolExecutor: (name: string, args: any) => Promise<any>,
        provider: LLMProvider
    ) {
        this.#tools = tools;
        this.#toolExecutor = toolExecutor;
        this.#provider = provider;
        this.#promptBuilder = new SystemPromptBuilder();
    }

    public updateProvider(newProvider: LLMProvider) {
        this.#provider = newProvider;
        log.success(`LLM Provider Updated: ${newProvider.getName()}`);
    }

    public getProvider(): LLMProvider {
        return this.#provider;
    }

    public getConfig(): Omit<LLMProviderConfig, 'apiKey'> {
        return this.#provider.getConfig();
    }

    public getHistory(): CoreMessage[] {
        return [...this.#history];
    }

    public async saveHistory(filepath: string) {
        try {
            const resolved = resolveSafePath(filepath);
            await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
            await fs.promises.writeFile(resolved, JSON.stringify(this.#history, null, 2), 'utf-8');
            log.success(`History saved to ${filepath}`);
        } catch (e: unknown) {
            log.error(`Failed to save history: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    public async loadHistory(filepath: string) {
        try {
            const resolved = resolveSafePath(filepath);
            const content = await fs.promises.readFile(resolved, 'utf-8');
            const data = JSON.parse(content);
            if (Array.isArray(data)) {
                this.#history = data;
                log.success(`History loaded from ${filepath} (${this.#history.length} messages)`);
            } else {
                log.warn('Invalid history file format');
            }
        } catch (e: unknown) {
            log.error(`Failed to load history: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    public clearHistory() {
        this.#history = [];
        log.info('Chat history cleared.');
    }

    public setActiveContext(context: { id: string, title: string } | null) {
        this.#activeContext = context;
        if (context) {
            log.info(`Active context set to: ${context.title} (${context.id})`);
        } else {
            log.info('Active context cleared.');
        }
    }

    public getActiveContext() {
        return this.#activeContext;
    }

    private async fetchOntology() {
        if (this.#ontologyCache) return;
        try {
            const result: any = await this.#toolExecutor('query_ontology', { query: 'ROOT' });
            this.#ontologyCache = result?.content?.[0]?.text ?? 'No ontology available.';
        } catch {
            this.#ontologyCache = 'Ontology unavailable.';
        }
    }

    private async fetchCapabilities() {
        if (this.#capabilitiesCache) return;
        try {
            if (this.#tools.some(t => t.name === 'get_capabilities')) {
                const result: any = await this.#toolExecutor('get_capabilities', {});
                this.#capabilitiesCache = result?.content?.[0]?.text ? JSON.parse(result.content[0].text) : null;
            }
        } catch {
            // Ignore capability fetch errors (tool might not exist yet)
        }
    }

    async handleInteraction(input: string) {
        if (!this.#ontologyCache) await this.fetchOntology();
        if (!this.#capabilitiesCache) await this.fetchCapabilities();

        this.#history.push({ role: 'user', content: input });

        if (this.#history.length > 50) {
            this.#history = this.#history.slice(this.#history.length - 50);
        }

        let turns = 0;
        while (turns++ < 10) {
            if (!(await this.executeTurn())) break;
        }
    }

    private async streamLLMResponse(messages: CoreMessage[]): Promise<string> {
        const spinner = ora('Thinking...').start();
        let fullText = '';
        let isFirstChunk = true;

        try {
            for await (const chunk of this.#provider.generateStream(messages)) {
                if (isFirstChunk) {
                    spinner.stop();
                    log.chat('Agent', '');
                    isFirstChunk = false;
                }
                process.stdout.write(chunk);
                fullText += chunk;
            }
        } catch (streamError: unknown) {
            spinner.fail('Stream failed');
            throw streamError;
        }

        if (isFirstChunk) {
            spinner.stop();
        } else {
            process.stdout.write('\n');
        }

        return fullText;
    }

    private async executeTurn(): Promise<boolean> {
        try {
            const systemPrompt = this.#promptBuilder.build(
                this.#capabilitiesCache,
                this.#ontologyCache,
                this.#tools,
                this.#activeContext
            );

            const messages: CoreMessage[] = [
                { role: 'system', content: systemPrompt },
                ...this.#history
            ];

            const fullText = await this.streamLLMResponse(messages);
            this.#history.push({ role: 'assistant', content: fullText });

            const toolCalls = parseToolCalls(fullText);

            if (toolCalls.length > 0) {
                for (const call of toolCalls) {
                    await this.processToolCall(call);
                }
                return true;
            }

            return false;
        } catch (e: unknown) {
            log.error('Error in LLM loop', e);
            return false;
        }
    }

    private async processToolCall(call: ToolCall) {
        try {
            const toolResult = await withSpinner(
                `Executing tool: ${chalk.bold(call.tool)}`,
                () => this.#toolExecutor(call.tool, call.args)
            );
            const resultStr = JSON.stringify(toolResult, null, 2);
            this.#history.push({ role: 'user', content: `Tool Result (${call.tool}): ${resultStr}` });
        } catch (toolErr: unknown) {
            const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
            log.error(`Tool execution failed`, toolErr);
            this.#history.push({ role: 'user', content: `Tool Error (${call.tool}): ${msg}` });
        }
    }
}
