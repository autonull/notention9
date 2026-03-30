import fs from 'fs';
import path from 'path';
import { fsTools } from '../cli/dist/tools/fs.js';

async function main() {
    const searchTool = fsTools.find(t => t.name === 'search_local_files');
    if (!searchTool) throw new Error("Tool not found");

    const tempDir = path.resolve('temp_search_test');
    try {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        fs.mkdirSync(tempDir);
        fs.writeFileSync(path.join(tempDir, 'target.txt'), 'This is the SECRET_KEY for testing.');
        fs.writeFileSync(path.join(tempDir, 'dummy.txt'), 'Just some text.');

        console.log("Testing Recursive Search...");
        const result = await searchTool.execute({ query: 'SECRET_KEY', path: tempDir });

        console.log("Search Result:", result);

        if (typeof result === 'string' && result.includes('target.txt') && result.includes('SECRET_KEY')) {
             console.log("✅ Found target string.");
        } else {
             throw new Error("Failed to find target string.");
        }

    } catch (e) {
        console.error("Verification Failed:", e);
        process.exit(1);
    } finally {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

main();
