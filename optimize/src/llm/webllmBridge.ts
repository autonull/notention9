/**
 * WebLLM Bridge for Optimizer
 * Launches headless Chrome via Playwright with WebGPU, loads the UI build with optimizer mode,
 * and exposes page.evaluate() API for semantic property extraction.
 */

import { chromium, type Browser, type Page } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { DEFAULT_ONTOLOGY, collectOntologyKeys } from '@notention/core';
import type { Property, OntologyNode } from '@notention/core';

export interface WebLLMBridgeOptions {
    uiBuildPath?: string;
    modelId?: string;
    headless?: boolean;
    timeout?: number;
}

interface ExtractionRequest {
    text: string;
    ontologyKeys: string[];
}

let cachedBrowser: Browser | null = null;
let cachedPage: Page | null = null;
let initializationPromise: Promise<void> | null = null;
let currentOptions: WebLLMBridgeOptions | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;
let httpServerUrl: string | null = null;

const DEFAULT_MODEL_ID = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
const DEFAULT_TIMEOUT = 180000; // 3 minutes for model load
const DEFAULT_UI_BUILD_PATH = '/home/me/notention9/ui/dist';

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
};

async function startHttpServer(uiBuildPath: string): Promise<string> {
    if (httpServer && httpServerUrl) {
        return httpServerUrl;
    }

    return new Promise((resolve, reject) => {
        const server = createServer(async (req, res) => {
            try {
                const url = new URL(req.url || '/', 'http://localhost');
                let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
                filePath = join(uiBuildPath, filePath);
                
                const ext = extname(filePath);
                const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
                
                const content = await readFile(filePath);
                res.writeHead(200, { 'Content-Type': mimeType });
                res.end(content);
            } catch (e) {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        server.listen(0, 'localhost', () => {
            const address = server.address();
            if (address && typeof address === 'object') {
                httpServerUrl = `http://localhost:${address.port}`;
                httpServer = server;
                console.log('[Bridge] HTTP server started at:', httpServerUrl);
                resolve(httpServerUrl);
            } else {
                reject(new Error('Failed to start HTTP server'));
            }
        });

        server.on('error', reject);
    });
}

async function stopHttpServer(): Promise<void> {
    if (httpServer) {
        return new Promise((resolve) => {
            httpServer!.close(() => {
                httpServer = null;
                httpServerUrl = null;
                resolve();
            });
        });
    }
}

async function launchBrowser(options: WebLLMBridgeOptions): Promise<{ browser: Browser; page: Page }> {
    const uiBuildPath = options.uiBuildPath ?? DEFAULT_UI_BUILD_PATH;
    const baseUrl = await startHttpServer(uiBuildPath);
    
    const browser = await chromium.launch({
        headless: options.headless ?? true,
        args: [
            '--headless=new',
            '--enable-webgpu',
            '--use-angle=swiftshader',
            '--enable-features=WebGPU',
            '--enable-unsafe-swiftshader',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu-sandbox',
            '--enable-logging',
            '--v=1',
        ],
    });

    const page = await browser.newPage();
    
    // Capture ALL console logs for debugging
    page.on('console', msg => {
        const text = msg.text();
        console.log(`[Browser Console] ${text}`);
    });
    
    page.on('pageerror', err => {
        console.error('[Browser Error]', err.message);
    });

    page.on('crash', () => {
        console.error('[Browser] Page crashed!');
    });

    page.on('close', () => {
        console.log('[Browser] Page closed');
    });

    browser.on('disconnected', () => {
        console.log('[Browser] Browser disconnected');
    });

    // Increase timeout for model loading
    page.setDefaultTimeout(options.timeout ?? DEFAULT_TIMEOUT);

    // Navigate to the UI build with optimizer mode via HTTP server
    const pageUrl = `${baseUrl}/index.html?optimizer=true`;
    console.log('[Bridge] Navigating to:', pageUrl);
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    console.log('[Bridge] Navigation complete');

    // Wait for the optimizer AI functions to be exposed
    await page.waitForFunction(
        () => !!(window as any).__OPTIMIZER_AI__,
        { timeout: 10000 }
    );
    console.log('[Bridge] __OPTIMIZER_AI__ exposed');

    return { browser, page };
}

async function initializeWebLLMInPage(page: Page, modelId: string, timeout: number): Promise<void> {
    console.log('[Bridge] Initializing WebLLM in page...');
    
    // Call the initializeAI function exposed by the UI build
    try {
        await page.evaluate(async (modelId: string) => {
            console.log('[Page] Starting initializeAI...');
            const { initializeAI } = (window as any).__OPTIMIZER_AI__;
            if (!initializeAI) {
                throw new Error('initializeAI not available on window.__OPTIMIZER_AI__');
            }
            console.log('[Page] Calling initializeAI with webllmModelId:', modelId);
            await initializeAI({
                enableWebLLM: true,
                enableRemote: false,
                enableHeuristic: false,
                webllmModelId: modelId,
            });
            console.log('[Page] initializeAI completed');
        }, modelId);
    } catch (e) {
        console.error('[Bridge] initializeAI failed:', e);
        throw e;
    }

    // Wait for WebLLM engine to be ready
    console.log('[Bridge] Waiting for WebLLM to be ready...');
    try {
        await page.waitForFunction(
            () => {
                const router = (window as any).__OPTIMIZER_AI__?.getInferenceRouter?.();
                if (!router) {
                    console.log('[Page] No router yet');
                    return false;
                }
                const providers = router.getAvailableProviders();
                console.log('[Page] Available providers:', providers.map((p: { name: string }) => p.name));
                const webllmProvider = providers.find((p: { name: string }) => p.name === 'webllm');
                if (!webllmProvider) {
                    console.log('[Page] WebLLM provider not found');
                    return false;
                }
                console.log('[Page] WebLLM provider found:', webllmProvider);
                return true;
            },
            { timeout }
        );
    } catch (e) {
        console.error('[Bridge] waitForFunction failed:', e);
        throw e;
    }
    console.log('[Bridge] WebLLM ready!');
}

async function extractProperties(page: Page, text: string, ontology: OntologyNode[]): Promise<Property[]> {
    const ontologyKeys = collectOntologyKeys(ontology);

    const result = await page.evaluate(
        async (args: { text: string; ontologyKeys: string[] }) => {
            const { getInferenceRouter } = (window as any).__OPTIMIZER_AI__;
            if (!getInferenceRouter) {
                throw new Error('getInferenceRouter not available');
            }
            
            const router = getInferenceRouter();
            if (!router) {
                throw new Error('Inference router not available');
            }

            const providers = router.getAvailableProviders();
            const webllmProvider = providers.find((p: any) => p.name === 'webllm');
            if (!webllmProvider) {
                throw new Error('WebLLM provider not available');
            }

            const provider = (router as any).providers.get('webllm');
            if (!provider) {
                throw new Error('WebLLM provider instance not found');
            }

            // Use the provider's doAlignToOntology method
            if (typeof provider.doAlignToOntology === 'function') {
                return await provider.doAlignToOntology(args.text, (window as any).DEFAULT_ONTOLOGY);
            }

            // Fallback: use the inference router
            const result = await router.infer({
                text: args.text,
                task: 'align',
                ontology: (window as any).DEFAULT_ONTOLOGY,
            });

            return result.properties || [];
        },
        { text, ontologyKeys: Array.from(ontologyKeys) }
    );

    return result;
}

export async function getOrCreateBridge(options: WebLLMBridgeOptions): Promise<Page> {
    const opts = {
        modelId: DEFAULT_MODEL_ID,
        headless: true,
        timeout: DEFAULT_TIMEOUT,
        uiBuildPath: DEFAULT_UI_BUILD_PATH,
        ...options,
    };

    // Check if we can reuse the cached browser/page
    if (cachedBrowser && cachedPage && currentOptions) {
        const sameOptions = 
            currentOptions.uiBuildPath === opts.uiBuildPath &&
            currentOptions.modelId === opts.modelId &&
            currentOptions.headless === opts.headless;

        if (sameOptions) {
            // Verify the page is still alive
            try {
                await cachedPage.evaluate(() => true);
                return cachedPage;
            } catch {
                // Page is dead, need to recreate
                cachedBrowser = null;
                cachedPage = null;
                currentOptions = null;
                initializationPromise = null;
            }
        }
    }

    // Create new browser/page if needed
    if (!initializationPromise) {
        initializationPromise = (async () => {
            const { browser, page } = await launchBrowser(opts);
            await initializeWebLLMInPage(page, opts.modelId ?? DEFAULT_MODEL_ID, opts.timeout ?? DEFAULT_TIMEOUT);
            cachedBrowser = browser;
            cachedPage = page;
            currentOptions = opts;
        })();
    }

    await initializationPromise;
    if (!cachedPage) {
        throw new Error('Failed to initialize WebLLM bridge');
    }
    return cachedPage;
}

export async function extractWithWebLLM(
    text: string,
    ontology: OntologyNode[] = DEFAULT_ONTOLOGY,
    options: WebLLMBridgeOptions
): Promise<Property[]> {
    const page = await getOrCreateBridge(options);
    return extractProperties(page, text, ontology);
}

export async function closeBridge(): Promise<void> {
    if (cachedBrowser) {
        await cachedBrowser.close();
        cachedBrowser = null;
        cachedPage = null;
        currentOptions = null;
        initializationPromise = null;
    }
    await stopHttpServer();
}

export function isBridgeInitialized(): boolean {
    return cachedBrowser !== null && cachedPage !== null;
}

/**
 * Provider implementation that uses the WebLLM bridge
 */
export class WebLLMBridgeProvider {
    name = 'webllm-bridge';
    private options: WebLLMBridgeOptions;

    constructor(options: WebLLMBridgeOptions) {
        this.options = options;
    }

    async extract(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        try {
            return await extractWithWebLLM(text, ontology, this.options);
        } catch (error) {
            console.warn(`WebLLM extraction failed: ${error}`);
            // Fallback to deterministic
            const { alignToOntology } = await import('@notention/core');
            return alignToOntology(text, ontology);
        }
    }
}

/**
 * Get the default UI build path
 */
export function getDefaultUIBuildPath(): string {
    return DEFAULT_UI_BUILD_PATH;
}