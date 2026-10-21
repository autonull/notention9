import { log } from './utils.js';

export interface ToolCall {
    tool: string;
    args: any;
}

const REGEX = {
    JSON_BLOCK: /```json\s*(\{[\s\S]*?\})\s*```/g,
    FALLBACK: /(\{\s*"tool"\s*:[\s\S]*?\})/g,
} as const;

export function parseToolCalls(text: string): ToolCall[] {
    const matches = [...text.matchAll(REGEX.JSON_BLOCK)].length > 0
        ? [...text.matchAll(REGEX.JSON_BLOCK)]
        : [...text.matchAll(REGEX.FALLBACK)];

    return matches
        .map(match => {
            try {
                return JSON.parse(match[1]);
            } catch {
                log.error('Failed to parse tool JSON snippet');
                return null;
            }
        })
        .filter((call): call is ToolCall => call !== null && typeof call.tool === 'string');
}