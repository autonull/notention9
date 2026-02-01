import { log, error } from './utils';

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
    log('ActionExecutor', 'Browser action:', action.url);

    // Lazy import playwright to avoid overhead if not used
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({
        headless: true
    });

    try {
        const page = await browser.newPage();

        // Basic navigation and extraction logic
        // This is a generic implementation - typically actions would strictly define what to do
        await page.goto(action.url, { waitUntil: 'domcontentloaded' });

        let result: any = null;

        if (action.extract) {
            // If action defines extraction selectors
            // { extract: { "title": "h1", "items": ".item" } }
            result = await page.evaluate((selectors: any) => {
                const data: any = {};
                for (const key in selectors) {
                    const selector = selectors[key];
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 1) {
                        data[key] = Array.from(elements).map(e => e.textContent?.trim());
                    } else if (elements.length === 1) {
                        data[key] = elements[0].textContent?.trim();
                    }
                }
                return data;
            }, action.extract);
        } else {
            // Default extraction: Title and main text
            result = await page.evaluate(() => ({
                title: document.title,
                content: document.body.innerText.substring(0, 5000) // Truncate generic scrape
            }));
        }

        // Handle specific interactions if defined
        if (action.interactions) {
            for (const step of action.interactions) {
                if (step.type === 'click') await page.click(step.selector);
                if (step.type === 'type') await page.fill(step.selector, step.value);
                if (step.type === 'wait') await page.waitForSelector(step.selector);
            }

            // Re-evaluate result after interactions if needed
            if (action.postInteractionExtract) {
                // ... similar extraction logic
            }
        }

        return [result];
    } catch (e) {
        error('ActionExecutor', 'Browser automation failed', e);
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
