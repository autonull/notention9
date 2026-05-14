import { log, error } from './utils.js';
import { Capabilities } from './Capabilities.js';

/**
 * Execute a skill action (browser automation, API call, etc.)
 * This replaces the stub implementation in SkillToolAdapter
 */
export async function executeAction(action: any): Promise<any[]> {
    log('ActionExecutor', 'Executing action:', action);

    if (!action || !action.type) {
        throw new Error('Invalid action: missing type');
    }

    try {
        switch (action.type) {
            case 'browser':
                return await executeBrowserAction(action);
            case 'api':
                return await executeAPIAction(action);
            case 'command':
                return await executeCommandAction(action);
            default:
                error('ActionExecutor', `Unknown action type: ${action.type}`);
                throw new Error(`Unsupported action type: ${action.type}`);
        }
    } catch (e: any) {
        error('ActionExecutor', 'Action execution failed:', e);
        throw e;
    }
}

async function executeBrowserAction(action: any): Promise<any[]> {
    if (!Capabilities.getInstance().isEnabled('browser')) {
        throw new Error("Capability 'browser' is disabled. Please configure the agent to allow browser actions.");
    }

    log('ActionExecutor', 'VoltBrowser action:', action.url);

    // Lazy import playwright
    const { chromium } = await import('playwright');

    // Use a persistent context if we want to save state, but for now launch fresh
    // TODO: Implement persistent context management in VoltBrowserCoordinator
    const browser = await chromium.launch({
        headless: true // Make configurable via action.headless if needed
    });

    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });
        const page = await context.newPage();

        // 1. Navigation
        if (action.url) {
            // Check for localhost
            if (action.url.includes('localhost') || action.url.includes('127.0.0.1')) {
                if (!action.allowLocalhost) {
                    throw new Error('Security: Localhost access denied. Set allowLocalhost: true in action.');
                }
            }
            await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        }

        // 2. Complex Interactions
        if (action.interactions && Array.isArray(action.interactions)) {
            for (const step of action.interactions) {
                log('ActionExecutor', `Interaction: ${step.type} ${step.selector || ''}`);

                // Broadcast action for Visual Feedback (Agent Cursor)
                // This mimics "broadcasting" by logging special events that headers/listeners can pick up
                // In a real system, we'd emit to the WebSocket server here.
                // TODO: Inject 'broadcastToUI' into execution context

                try {
                    switch (step.type) {
                        case 'click':
                            await page.click(step.selector, { timeout: 5000 });
                            break;
                        case 'type':
                            await page.fill(step.selector, step.value, { timeout: 5000 });
                            break;
                        case 'wait':
                            if (typeof step.value === 'number') {
                                await page.waitForTimeout(step.value);
                            } else {
                                await page.waitForSelector(step.selector, { timeout: 10000 });
                            }
                            break;
                        case 'scroll':
                            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                            break;
                        case 'hover':
                            await page.hover(step.selector);
                            break;
                        case 'press':
                            await page.press(step.selector, step.key);
                            break;
                    }
                } catch (e: any) {
                    error('ActionExecutor', `Interaction failed: ${step.type}`, e);
                    if (action.abortOnError) throw e;
                }
            }
        }

        // 3. Extraction
        let data: any = {};

        if (action.extract) {
            data = await page.evaluate((selectors: any) => {
                const result: any = {};
                for (const key in selectors) {
                    const selector = selectors[key];
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 1) {
                        result[key] = Array.from(elements).map(e => e.textContent?.trim()).filter(t => t);
                    } else if (elements.length === 1) {
                        result[key] = elements[0].textContent?.trim();
                    }
                }
                return result;
            }, action.extract);
        } else {
            // Default: Title, URL, and simple content
            data = await page.evaluate(() => ({
                title: document.title,
                url: window.location.href,
                content: document.body.innerText.substring(0, 5000)
            }));
        }

        // 4. Screenshots (Visual Feedback)
        if (action.screenshot) {
            const screenshotBuffer = await page.screenshot({
                fullPage: action.screenshot === 'full'
            });
            // Convert to base64 for direct embedding in Note
            data._screenshot = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
        }

        return [data];
    } catch (e) {
        error('ActionExecutor', 'VoltBrowser automation failed', e);
        throw e;
    } finally {
        await browser.close();
    }
}

async function executeAPIAction(action: any): Promise<any[]> {
    log('ActionExecutor', 'API action:', action.url);

    const response = await fetch(action.url, {
        method: action.method || 'GET',
        headers: action.headers || {},
        body: action.body ? JSON.stringify(action.body) : undefined
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform API response to results array
    if (Array.isArray(data)) {
        return data;
    } else if (data.results || data.items || data.data) {
        return data.results || data.items || data.data;
    } else {
        return [data];
    }
}

async function executeCommandAction(action: any): Promise<any[]> {
    log('ActionExecutor', 'Command action:', action.command);

    // TODO: Integrate with child_process for command execution
    // For now, this is a security-sensitive placeholder

    throw new Error('Command execution not yet implemented for security reasons.');
}
