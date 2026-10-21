const FENCE = /```[a-zA-Z]*\s*/g;

/**
 * Remove markdown code fences wrapping a JSON payload.
 */
export const stripJsonFence = (text: string): string => text.replace(FENCE, '').trim();

/**
 * Parse a JSON payload that may be wrapped in a markdown code fence.
 * Returns null instead of throwing when the payload is not valid JSON.
 */
export const parseJsonBlock = <T>(text: string): T | null => {
  try {
    return JSON.parse(stripJsonFence(text)) as T;
  } catch {
    return null;
  }
};
