import type {Page} from '@playwright/test';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const TILE = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect width="256" height="256" fill="#1f2937"/>
<path d="M0 64H256M0 128H256M0 192H256M64 0V256M128 0V256M192 0V256" stroke="#374151" stroke-width="1"/>
</svg>`;

export async function isolateNetwork(page: Page) {
    await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (LOCAL_HOSTS.has(url.hostname)) return route.continue();
        return route.abort();
    });
    await page.route(/https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/, route =>
        route.fulfill({status: 200, contentType: 'image/svg+xml', body: TILE})
    );
    await page.routeWebSocket(/wss?:\/\/(?!localhost|127\.0\.0\.1)/, ws => ws.close());
}
