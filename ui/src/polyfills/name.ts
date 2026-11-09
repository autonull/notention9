// __name polyfill for Rollup's CommonJS helper
// This must be imported FIRST before any other modules that might use __name

// Define __name in module scope so it's available to all code in this module
// and any code that imports this module
export var __name = function __name(fn: Function, name: string): Function {
    try {
        Object.defineProperty(fn, 'name', { value: name, configurable: true });
    } catch (e) {
        // Ignore errors (e.g., in environments where defineProperty is not supported)
    }
    return fn;
};

// Also set on globalThis for non-module access
if (typeof globalThis !== 'undefined') {
    globalThis.__name = __name;
}
if (typeof window !== 'undefined') {
    window.__name = __name;
}

// Export a no-op for tree-shaking if needed
export function defineName(fn: Function, name: string): Function {
    return __name(fn, name);
}