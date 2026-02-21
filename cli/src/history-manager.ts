import fs from 'fs';
import path from 'path';
import os from 'os';

const HISTORY_FILE = path.join(os.homedir(), '.notention_cli_history');

export function loadHistory(): string[] {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
            // Readline expects history array where index 0 is the most recent.
            // Our file is appended, so the last line is the most recent.
            // We should split and return. The caller (interactive.ts) handles reverse if needed,
            // or we handle it here. Let's handle it here to be cleaner.
            const lines = content.split('\n').filter(Boolean);
            return lines;
        }
    } catch (e) {
        // Ignore errors
    }
    return [];
}

export function appendHistory(line: string) {
    try {
        if (!line.trim()) return;
        fs.appendFileSync(HISTORY_FILE, line + '\n', 'utf-8');
    } catch (e) {
        // Ignore errors
    }
}
