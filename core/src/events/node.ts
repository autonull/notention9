/**
 * Node.js-only event sinks
 * These sinks use Node.js APIs (fs, etc.) and should not be bundled for the browser
 */

export { FileSink, type FileSinkOptions } from './FileSink.js';