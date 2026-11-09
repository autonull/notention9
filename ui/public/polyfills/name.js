// __name polyfill for Rollup's CommonJS helper
// Must be loaded before any module code that might reference __name
var __name = function __name(fn, name) {
    try {
        Object.defineProperty(fn, 'name', { value: name, configurable: true });
    } catch (e) {}
    return fn;
};
if (typeof window !== 'undefined') window.__name = __name;
if (typeof globalThis !== 'undefined') globalThis.__name = __name;
export { __name };