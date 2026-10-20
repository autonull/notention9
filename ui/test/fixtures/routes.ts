import type {Page} from '@playwright/test';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export async function isolateNetwork(page: Page) {
    await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (LOCAL_HOSTS.has(url.hostname)) return route.continue();
        return route.abort();
    });
    await page.routeWebSocket(/wss?:\/\/(?!localhost|127\.0\.0\.1)/, ws => ws.close());
}
