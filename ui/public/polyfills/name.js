// Polyfill for __name helper used by minifiers (esbuild/rolldown)
// This function sets the name property on a function for debugging
if (typeof window !== 'undefined' && typeof window.__name === 'undefined') {
    window.__name = function __name(fn, name) {
        try {
            Object.defineProperty(fn, 'name', { value: name, configurable: true });
        } catch (e) {
            // Ignore errors in environments that don't support defining function names
        }
        return fn;
    };
}
if (typeof globalThis !== 'undefined' && typeof globalThis.__name === 'undefined') {
    globalThis.__name = function __name(fn, name) {
        try {
            Object.defineProperty(fn, 'name', { value: name, configurable: true });
        } catch (e) {
            // Ignore errors
        }
        return fn;
    };
}