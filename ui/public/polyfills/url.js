// Browser-compatible url polyfill with fileURLToPath
// Standalone implementation - no external dependencies

export class URLPolyfill {
    constructor(url, base) {
        if (base) {
            this.href = new URL(url, base).href;
        } else {
            this.href = url;
        }
        const parsed = new URL(this.href);
        this.protocol = parsed.protocol;
        this.host = parsed.host;
        this.hostname = parsed.hostname;
        this.port = parsed.port;
        this.pathname = parsed.pathname;
        this.search = parsed.search;
        this.hash = parsed.hash;
        this.origin = parsed.origin;
    }
}

export class URLSearchParamsPolyfill {
    constructor(init) {
        this.params = new URLSearchParams(init);
    }
    append(name, value) { this.params.append(name, value); }
    delete(name) { this.params.delete(name); }
    get(name) { return this.params.get(name); }
    getAll(name) { return this.params.getAll(name); }
    has(name) { return this.params.has(name); }
    set(name, value) { this.params.set(name, value); }
    sort() { this.params.sort(); }
    toString() { return this.params.toString(); }
}

export function fileURLToPath(url) {
    if (typeof url === 'string' && url.startsWith('file://')) {
        const path = url.slice(7);
        return decodeURIComponent(path);
    }
    if (url && url.href) {
        return url.href;
    }
    return url;
}

export function pathToFileURL(path) {
    return new URL('file://' + encodeURIComponent(path));
}

export function format(urlObj) {
    return urlObj?.href || '';
}

export function parse(urlStr) {
    return new URL(urlStr);
}

export function resolve(from, to) {
    return new URL(to, from).href;
}

export function resolveObject(from, to) {
    return new URL(to, from);
}

export const URL = URLPolyfill;
export const URLSearchParams = URLSearchParamsPolyfill;

export default {
    URL: URLPolyfill,
    URLSearchParams: URLSearchParamsPolyfill,
    fileURLToPath,
    pathToFileURL,
    format,
    parse,
    resolve,
    resolveObject,
};