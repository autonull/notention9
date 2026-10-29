import { chromium, Browser, BrowserContext, Page } from 'playwright';
import chalk from 'chalk';
import type { Agent } from './agent.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';

export interface BrowserManagerOptions {
    resolution: { width: number; height: number };
    uiPort: number;
    relayUrl: string;
}

interface AgentContext {
    agent: Agent;
    context: BrowserContext;
    page: Page;
}

export class BrowserManager {
    private browser: Browser | null = null;
    private agentContexts: AgentContext[] = [];
    private dedicatedPages: Map<string, Page> = new Map();

    constructor(private readonly options: BrowserManagerOptions) {}

    async start(): Promise<Browser> {
        this.browser = await chromium.launch({ headless: true });
        return this.browser;
    }

    async configureAgents(agents: Agent[]): Promise<void> {
        if (!this.browser) throw new Error('Browser not started');
        
        this.log(`Configuring ${agents.length} agent sessions...`);

        for (const agent of agents) {
            // Create isolated context for each agent (separate localStorage/cookies)
            const context = await this.browser.newContext({
                viewport: this.options.resolution,
                bypassCSP: true,
                ignoreHTTPSErrors: true
            });
            
            const page = await context.newPage();
            const url = `http://localhost:${this.options.uiPort}`;
            
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.evaluate(async (data: { key: string; relayUrl: string }) => {
                    const settings = {
                        aiEnabled: false,
                        developerMode: false,
                        theme: 'dark',
                        nostr: { privkey: data.key, relays: [data.relayUrl] },
                        ontology: DEFAULT_ONTOLOGY
                    };
                    return new Promise<void>((resolve, reject) => {
                        const request = indexedDB.open('localforage');
                        request.onerror = () => reject(request.error);
                        request.onupgradeneeded = (e: any) => {
                            e.target.result.createObjectStore('keyvaluepairs');
                        };
                        request.onsuccess = (e: any) => {
                            const store = e.target.result.transaction(['keyvaluepairs'], 'readwrite').objectStore('keyvaluepairs');
                            const putReq = store.put(settings, 'notention-settings-v2');
                            putReq.onsuccess = () => resolve();
                            putReq.onerror = () => reject(putReq.error);
                        };
                    });
                }, { key: agent.secretKey, relayUrl: this.options.relayUrl });
                
                this.agentContexts.push({ agent, context, page });
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                this.error(new Error(`Failed to configure agent ${agent.profile.name}: ${message}`));
                await context.close();
            }
        }
    }

    async createPage(owner?: string): Promise<Page> {
        if (!this.browser) throw new Error('Browser not started');
        
        // If owner is specified, return or create a dedicated page for that owner
        if (owner) {
            const existing = this.dedicatedPages.get(owner);
            if (existing) return existing;
            
            const context = await this.browser.newContext({
                viewport: this.options.resolution,
                bypassCSP: true,
                ignoreHTTPSErrors: true
            });
            const page = await context.newPage();
            this.dedicatedPages.set(owner, page);
            return page;
        }
        
        // No owner specified - create a new independent page (not tied to any agent)
        const context = await this.browser.newContext({
            viewport: this.options.resolution,
            bypassCSP: true,
            ignoreHTTPSErrors: true
        });
        return context.newPage();
    }

    getAgentPage(agentName: string): Page | undefined {
        const ctx = this.agentContexts.find(c => c.agent.profile.name === agentName);
        return ctx?.page;
    }

    getAgentContext(agentName: string): BrowserContext | undefined {
        const ctx = this.agentContexts.find(c => c.agent.profile.name === agentName);
        return ctx?.context;
    }

    async navigateToDashboard(page: Page, dashboardPort: number, view: 'dashboard' | 'ontology' = 'dashboard'): Promise<void> {
        const url = `http://localhost:${dashboardPort}${view === 'ontology' ? '/ontology' : ''}`;
        await page.goto(url, { waitUntil: 'networkidle' });
    }

    async cleanup(): Promise<void> {
        for (const { context } of this.agentContexts) {
            await context.close();
        }
        this.agentContexts = [];
        
        for (const page of this.dedicatedPages.values()) {
            await page.context().close();
        }
        this.dedicatedPages.clear();
        
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    private log(message: string) {
        console.log(chalk.blue(`[BrowserManager] ${message}`));
    }

    private error(err: Error) {
        console.error(chalk.red(`[BrowserManager Error]`), err);
    }
}