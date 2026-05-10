import { LlmSession } from '../llm.js';
import { log } from '../utils.js';

/**
 * Session management commands - clear, save, load chat history
 */

export const handleClear = async (_args: string[], session?: LlmSession): Promise<boolean> => {
    console.clear();
    session?.clearHistory();
    return true;
};

export const handleSave = async (args: string[], session?: LlmSession): Promise<boolean> => {
    if (!session) {
        log.error("Session unavailable in this context.");
        return true;
    }
    const savePath = args[0] || 'history.json';
    await session.saveHistory(savePath);
    return true;
};

export const handleLoad = async (args: string[], session?: LlmSession): Promise<boolean> => {
    if (!session) {
        log.error("Session unavailable in this context.");
        return true;
    }
    const loadPath = args[0] || 'history.json';
    await session.loadHistory(loadPath);
    return true;
};
