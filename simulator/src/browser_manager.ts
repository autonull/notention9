import { chromium, Browser, BrowserContext, Page } from 'playwright';
import chalk from 'chalk';
import type { Agent } from './agent.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';

export interface BrowserManagerOptions {
    resolution: { width: number; height: number };
    uiPort: number;
    relayUrl: string;
}

export class BrowserManager {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;

    constructor(private readonly options: BrowserManagerOptions) {}

    async start(): Promise<BrowserContext> {
        this.browser = await chromium.launch({ headless: true });
        this.context = await this.browser.newContext({
            viewport: this.options.resolution,
            bypassCSP: true,
            ignoreHTTPSErrors: true
        });
        return this.context;
    }

    async configureAgents(agents: Agent[]): Promise<void> {
        if (!this.context) throw new Error('Browser not started');
        
        const page = await this.context.newPage();
        this.log(`Configuring ${agents.length} agent sessions...`);

        for (const agent of agents) {
            const url = `http://${agent.id}.lvh.me:${this.options.uiPort}`;
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
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                this.error(new Error(`Failed to configure agent ${agent.profile.name}: ${message}`));
            }
        }
        await page.close();
    }

    async createPage(): Promise<Page> {
        if (!this.context) throw new Error('Browser not started');
        return this.context.newPage();
    }

    async navigateToDashboard(page: Page, dashboardPort: number, view: 'dashboard' | 'ontology' = 'dashboard'): Promise<void> {
        const url = `http://localhost:${dashboardPort}${view === 'ontology' ? '/ontology' : ''}`;
        await page.goto(url, { waitUntil: 'networkidle' });
    }

    async cleanup(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
        }
    }

    private log(message: string) {
        console.log(chalk.blue(`[BrowserManager] ${message}`));
    }

    private error(err: Error) {
        console.error(chalk.red(`[BrowserManager Error]`), err);
    }
}