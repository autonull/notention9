import type { BrowserContext, Page } from '@playwright/test';

/**
 * `tsx` compiles TypeScript with esbuild `keepNames: true`, which wraps every
 * function expression in a `__name(...)` call. Playwright serializes evaluated
 * functions into the page, so the *call* survives but its helper definition does
 * not — the page then throws `ReferenceError: __name is not defined`.
 *
 * Installing the helper as the very first init script makes every later
 * evaluated function (init scripts and `page.evaluate`) resolve it.
 */
export const NAME_POLYFILL_INIT_SCRIPT = `
globalThis.__name = globalThis.__name || function (fn, name) {
    try { Object.defineProperty(fn, 'name', { value: name, configurable: true }); } catch (e) {}
    return fn;
};
`;

export async function installNamePolyfill(target: BrowserContext | Page): Promise<void> {
    await target.addInitScript(NAME_POLYFILL_INIT_SCRIPT);
}
