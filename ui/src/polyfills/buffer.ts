// Buffer polyfill for browser bundles that expect Node's global Buffer.
// Imported before any app module so module-scope usage resolves.
import { Buffer } from 'buffer';

if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
    globalThis.Buffer = Buffer;
}
if (typeof window !== 'undefined' && !window.Buffer) {
    window.Buffer = Buffer;
}
